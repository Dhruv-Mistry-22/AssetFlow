import { z } from "zod";

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  department: z.string().optional(),
});

export const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ============================================================================
// ASSET SCHEMAS
// ============================================================================

export const registerAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  categoryId: z.string().min(1, "Category is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  acquisitionDate: z.string().datetime("Invalid date format"),
  acquisitionCost: z.number().positive("Cost must be positive"),
  location: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  isBookable: z.boolean().optional().default(false),
  warrantyExpiry: z.string().datetime().optional().or(z.literal("")),
  condition: z
    .enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"])
    .optional()
    .default("GOOD"),
});

export const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional(),
  status: z
    .enum([
      "AVAILABLE",
      "ALLOCATED",
      "RESERVED",
      "UNDER_MAINTENANCE",
      "LOST",
      "RETIRED",
      "DISPOSED",
    ])
    .optional(),
  condition: z
    .enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"])
    .optional(),
  description: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  warrantyExpiry: z.string().datetime().optional().or(z.literal("")),
  nextServiceDate: z.string().datetime().optional().or(z.literal("")),
  isBookable: z.boolean().optional(),
});

// ============================================================================
// ALLOCATION SCHEMAS
// ============================================================================

export const allocateAssetSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  expectedReturnDate: z.string().datetime().optional().or(z.literal("")),
  notes: z.string().optional(),
  department: z.string().optional(),
});

export const returnAssetSchema = z.object({
  returnCondition: z
    .enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"])
    .optional(),
  returnNotes: z.string().optional(),
});

export const transferRequestSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export const transferApproveSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().optional(),
});

// ============================================================================
// BOOKING SCHEMAS
// ============================================================================

export const createBookingSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  startTime: z.string().datetime("Invalid start time"),
  endTime: z.string().datetime("Invalid end time"),
  purpose: z.string().optional(),
  location: z.string().optional(),
});

// ============================================================================
// MAINTENANCE SCHEMAS
// ============================================================================

export const createMaintenanceSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

export const resolveMaintenanceSchema = z.object({
  resolutionNotes: z.string().min(5, "Resolution notes required"),
});

// ============================================================================
// ORGANIZATION SCHEMAS
// ============================================================================

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional(),
  parentDepartmentId: z.string().optional(),
  headOfDepartmentId: z.string().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  parentDepartmentId: z.string().optional().nullable(),
  headOfDepartmentId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  customFields: z.string().optional(),
});

export const promoteUserSchema = z.object({
  role: z.enum(["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"]),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;
export type AllocateAssetInput = z.infer<typeof allocateAssetSchema>;
export type ReturnAssetInput = z.infer<typeof returnAssetSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
