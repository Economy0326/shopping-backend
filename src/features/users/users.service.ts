import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        phone: true,
        defaultZip: true,
        defaultAddress1: true,
        defaultAddress2: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: number, data: UpdateProfileDto) {
    const allowed: Prisma.UserUpdateInput = {};

    const displayName = data.displayName ?? data.name ?? undefined;
    if (displayName !== undefined) allowed.displayName = displayName;

    if (data.phone !== undefined) allowed.phone = data.phone;

    if (data.address) {
      if (data.address.zip !== undefined) allowed.defaultZip = data.address.zip;
      if (data.address.address1 !== undefined) {
        allowed.defaultAddress1 = data.address.address1;
      }
      if (data.address.address2 !== undefined) {
        allowed.defaultAddress2 = data.address.address2;
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: allowed,
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        phone: true,
        defaultZip: true,
        defaultAddress1: true,
        defaultAddress2: true,
      },
    });
  }

  async setDefaultAddress(
    userId: number,
    address: { zip?: string; address1?: string; address2?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        defaultZip: address.zip,
        defaultAddress1: address.address1,
        defaultAddress2: address.address2,
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        phone: true,
        defaultZip: true,
        defaultAddress1: true,
        defaultAddress2: true,
      },
    });
  }
}
