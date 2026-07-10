export interface UserDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber?: string | null;
  employeeId?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  organization?: string | null;
  avatar?: string | null;
  status?: string | null;
  isActive: boolean;
  isLocked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSearchFilters {
  search?: string;
  department?: string;
  team?: string;
  status?: string;
  role?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  meta: any;
}
