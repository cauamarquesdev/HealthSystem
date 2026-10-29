import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return (this.prisma as any).user.findUnique({
      where: { email },
    });
  }

  async create(data: any) {
    return (this.prisma as any).user.create({
      data,
    });
  }
}
