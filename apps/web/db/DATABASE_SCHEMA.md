# KithulFlow Database Schema

## Authentication And Administration

### AdminUser

Stores admin portal login accounts.

- `id` - primary key
- `userId` - unique admin login ID
- `email` - unique admin email
- `displayName` - name shown in the top bar
- `passwordHash` - bcrypt password hash
- `createdAt`, `updatedAt` - audit timestamps

### Employee

Stores employee accounts managed from the admin panel.

- `id` - primary key
- `userId` - unique employee login ID
- `fullName` - employee display name
- `role` - operational role
- `status` - `Active` or `Inactive`
- `passwordHash` - bcrypt password hash
- `defaultLogin` - whether this employee is preselected for the role
- `createdAt`, `updatedAt` - audit timestamps

## Collection Centers

### Center

Stores field collection centers.

- `id` - primary key
- `centerId` - unique business ID
- `location` - center location
- `agent` - assigned center agent
- `contactPhone` - optional phone number
- `status` - `Active` or `Inactive`
- `createdAt`, `updatedAt` - audit timestamps

## Inventory

### SystemCan

Stores reusable system cans.

- `id` - primary key
- `canCode` - unique can code, such as `AR001`
- `status` - current can status
- `agentName` - assigned agent when dispatched
- `reference` - transfer or dispatch reference
- `lastUpdated` - last business status update time
- `createdAt`, `updatedAt` - audit timestamps

### CanHistory

Stores status history for a system can.

- `id` - primary key
- `canId` - foreign key to `SystemCan`
- `status` - status at this history event
- `agentName` - optional related agent
- `reference` - optional related reference
- `note` - optional event note
- `createdAt` - event timestamp

## Field Collection

### IssueNote

Stores field collection issue notes.

- `id` - primary key
- `issueNoteName` - issue note title
- `collectionDate` - collection date
- `centerId` - optional foreign key to `Center`
- `type` - issue note type
- `status` - `Active` or `Completed`
- `canCount` - number of cans in the issue note
- `totalQty` - total quantity collected
- `createdAt`, `updatedAt` - audit timestamps
