import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager, LockMode } from '@mikro-orm/core';
import { createHash, randomBytes } from 'crypto';
import { Household } from '../../entities/household.entity';
import { HouseholdMember } from '../../entities/household-member.entity';
import { HouseholdInvite } from '../../entities/household-invite.entity';
import { User } from '../../entities/user.entity';
import type { HouseholdContext } from './guards/household-member.guard';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import {
  HouseholdResponseDto,
  HouseholdDetailResponseDto,
  HouseholdMemberDto,
  InviteResponseDto,
} from './dto/household-response.dto';

@Injectable()
export class HouseholdService {
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(Household)
    private readonly householdRepo: EntityRepository<Household>,
    @InjectRepository(HouseholdMember)
    private readonly memberRepo: EntityRepository<HouseholdMember>,
    @InjectRepository(HouseholdInvite)
    private readonly inviteRepo: EntityRepository<HouseholdInvite>,
    @InjectRepository(User)
    private readonly userRepo: EntityRepository<User>,
    private readonly em: EntityManager,
  ) {
    const url = process.env.FRONTEND_URL;
    if (!url)
      throw new Error('Required environment variable FRONTEND_URL is not set');
    this.frontendUrl = url;
  }

  assertOwner(ctx: HouseholdContext): void {
    if (ctx.role !== 'owner') {
      throw new ForbiddenException(
        'Only the household owner can perform this action',
      );
    }
  }

  async createHousehold(
    userId: string,
    dto: CreateHouseholdDto,
  ): Promise<HouseholdResponseDto> {
    const household = new Household();
    household.name = dto.name;
    household.created_by = this.em.getReference(User, userId);

    const member = new HouseholdMember();
    member.household = household;
    member.user = this.em.getReference(User, userId);
    member.role = 'owner';

    this.em.persist(household);
    this.em.persist(member);
    await this.em.flush();

    return this.toDto(household, 1);
  }

  async listHouseholds(userId: string): Promise<HouseholdResponseDto[]> {
    const memberships = await this.memberRepo.find(
      { user: { id: userId }, household: { deleted_at: null } },
      { populate: ['household', 'household.members'] },
    );
    return memberships.map((m) =>
      this.toDto(m.household, m.household.members.length),
    );
  }

  async getHousehold(hid: string): Promise<HouseholdDetailResponseDto> {
    const household = await this.householdRepo.findOne(
      { id: hid, deleted_at: null },
      { populate: ['members.user'] },
    );
    if (!household) throw new NotFoundException(`Household ${hid} not found`);

    const members: HouseholdMemberDto[] = household.members
      .getItems()
      .map((m) => ({
        user_id: m.user.id,
        email: m.user.email,
        first_name: m.user.first_name,
        last_name: m.user.last_name,
        role: m.role,
        joined_at: m.joined_at,
      }));

    return { ...this.toDto(household, members.length), members };
  }

  async renameHousehold(
    hid: string,
    dto: UpdateHouseholdDto,
  ): Promise<HouseholdResponseDto> {
    const household = await this.householdRepo.findOne({
      id: hid,
      deleted_at: null,
    });
    if (!household) throw new NotFoundException(`Household ${hid} not found`);
    household.name = dto.name;
    await this.em.persist(household).flush();
    const members = await this.memberRepo.find({ household: { id: hid } });
    return this.toDto(household, members.length);
  }

  async softDeleteHousehold(hid: string): Promise<void> {
    const household = await this.householdRepo.findOne({
      id: hid,
      deleted_at: null,
    });
    if (!household) throw new NotFoundException(`Household ${hid} not found`);
    household.deleted_at = new Date();
    await this.em.persist(household).flush();
  }

  async createInvite(
    hid: string,
    inviterId: string,
    dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitee = await this.userRepo.findOne({ email: dto.email });

    const invite = new HouseholdInvite();
    invite.household = this.em.getReference(Household, hid);
    invite.invited_by = this.em.getReference(User, inviterId);
    invite.invitee_email = dto.email;
    invite.token_hash = tokenHash;
    invite.expires_at = expiresAt;
    if (invitee) {
      invite.invitee_email = invitee.email;
    }

    this.em.persist(invite);
    await this.em.flush();

    return {
      token: rawToken,
      invite_url: `${this.frontendUrl}/invite/${rawToken}`,
      expires_at: expiresAt,
    };
  }

  async acceptInvite(rawToken: string, userId: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invite = await this.inviteRepo.findOne({ token_hash: tokenHash });

    if (!invite) throw new GoneException({ reason: 'not_found' });
    if (invite.status === 'accepted')
      throw new GoneException({ reason: 'already_accepted' });
    if (invite.status === 'revoked')
      throw new GoneException({ reason: 'revoked' });
    if (invite.expires_at < new Date())
      throw new GoneException({ reason: 'expired' });

    const existing = await this.memberRepo.findOne({
      household: { id: invite.household.id },
      user: { id: userId },
    });
    if (existing) {
      invite.status = 'accepted';
      await this.em.persist(invite).flush();
      return;
    }

    const member = new HouseholdMember();
    member.household = invite.household;
    member.user = this.em.getReference(User, userId);
    member.role = 'member';

    invite.status = 'accepted';
    this.em.persist(member);
    this.em.persist(invite);
    await this.em.flush();
  }

  async removeMember(
    hid: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<void> {
    const requester = await this.memberRepo.findOne({
      household: { id: hid },
      user: { id: requesterId },
    });
    if (!requester) throw new ForbiddenException();

    if (requester.role !== 'owner' && requesterId !== targetUserId) {
      throw new ForbiddenException('Members can only remove themselves');
    }

    if (requester.role === 'owner' && requesterId === targetUserId) {
      await this.em.transactional(async (txEm) => {
        const owners = await txEm.find(
          HouseholdMember,
          { household: { id: hid }, role: 'owner' },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );
        if (owners.length <= 1) {
          throw new ConflictException(
            'Cannot remove the last owner of a household',
          );
        }
        await txEm.nativeDelete(HouseholdMember, {
          household: { id: hid },
          user: { id: targetUserId },
        });
      });
      return;
    }

    await this.em.nativeDelete(HouseholdMember, {
      household: { id: hid },
      user: { id: targetUserId },
    });
  }

  private toDto(h: Household, memberCount: number): HouseholdResponseDto {
    return {
      id: h.id,
      name: h.name,
      created_at: h.created_at,
      member_count: memberCount,
    };
  }
}
