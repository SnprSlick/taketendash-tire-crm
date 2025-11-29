import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMINISTRATOR')
  create(@Body() createUserDto: Prisma.UserCreateInput) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('ADMINISTRATOR')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CORPORATE')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR')
  update(@Param('id') id: string, @Body() updateUserDto: Prisma.UserUpdateInput) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/approve')
  @Roles('ADMINISTRATOR')
  approve(@Param('id') id: string) {
    return this.usersService.approveUser(id);
  }

  @Post(':id/role')
  @Roles('ADMINISTRATOR')
  assignRole(@Param('id') id: string, @Body() body: { role: string, scopes: string[] }) {
    return this.usersService.assignRole(id, body.role, body.scopes);
  }

  @Post(':id/stores')
  @Roles('ADMINISTRATOR')
  assignStores(@Param('id') id: string, @Body() body: { storeIds: string[] }) {
    return this.usersService.assignStores(id, body.storeIds);
  }

  @Delete(':id')
  @Roles('ADMINISTRATOR')
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
