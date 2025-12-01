import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }

    let user: any;

    // Handle GraphQL context
    if (context.getType<any>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      user = ctx.getContext().req?.user;
    } else {
      // Handle REST context
      const request = context.switchToHttp().getRequest();
      user = request.user;
    }

    if (!user || !user.role) {
      console.log('RolesGuard: No user or role found', user);
      return false;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      console.log(`RolesGuard: User role ${user.role} does not match required roles ${requiredRoles}`);
    }
    return hasRole;
  }
}