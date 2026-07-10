import { UserDTO } from "./user.dto";

export class UserMapper {
  static toDTO(user: any): UserDTO {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      employeeId: user.employeeId,
      department: user.department,
      jobTitle: user.jobTitle,
      organization: user.organization,
      avatar: user.avatar,
      status: user.status,
      isActive: user.isActive,
      isLocked: user.isLocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toDTOs(users: any[]): UserDTO[] {
    return users.map(user => this.toDTO(user));
  }
}
