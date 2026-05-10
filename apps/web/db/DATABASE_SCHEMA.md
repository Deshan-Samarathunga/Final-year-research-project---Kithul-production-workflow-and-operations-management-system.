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
- `mobileLocalId` - unique mobile UUID for idempotent local sync
- `issueNoteName` - issue note title
- `collectionDate` - collection date
- `centerId` - optional foreign key to `Center`
- `submittedByEmployeeId` - optional foreign key to the field collector employee
- `type` - issue note type
- `status` - `Active` or `Completed`
- `canCount` - number of cans in the issue note
- `totalQty` - total quantity collected
- `deletedAt` - soft-delete timestamp from offline sync
- `createdAt`, `updatedAt` - audit timestamps

### IssueNoteItem

Stores can quantity rows inside an issue note.

- `id` - primary key
- `mobileLocalId` - unique mobile UUID for idempotent sync
- `issueNoteId` - foreign key to `IssueNote`
- `canCode` - system can code
- `quantity` - collected quantity for that can
- `phValue` - pH reading captured for the can
- `brixValue` - Brix reading captured for the can
- `temperatureC` - temperature reading in Celsius for sap spoilage research
- `processingStatus` - latest processing quality state: `Pending`, `Accepted`, `Spoiled`, or `Returned`
- `deletedAt` - soft-delete timestamp from offline sync
- `createdAt`, `updatedAt` - audit timestamps

### ProcessingQualityCheck

Stores processing-stage Sap quality checks for issue-note can rows.

- `id` - primary key
- `issueNoteItemId` - foreign key to `IssueNoteItem`
- `phValue`, `brixValue`, `temperatureC` - before-processing measurements
- `decision` - staff decision, `Accepted` or `Spoiled`
- `reason` - optional note, usually used for spoiled sap
- `phWarning`, `brixWarning`, `temperatureWarning` - warning flags based on configured ranges
- `warningMessage` - combined warning message stored with the check
- `checkedAt` - processing quality check time
- `createdAt`, `updatedAt` - audit timestamps

### TransferNote

Stores empty-can transfer notes synced from mobile.

- `id` - primary key
- `mobileLocalId` - unique mobile UUID for idempotent sync
- `transferNoteNo` - transfer note number
- `transferDate` - transfer date
- `centerId` - optional foreign key to `Center`
- `submittedByEmployeeId` - optional foreign key to the field collector employee
- `status` - `Active` or `Completed`
- `canCount` - number of cans in the transfer note
- `deletedAt` - soft-delete timestamp from offline sync
- `createdAt`, `updatedAt` - audit timestamps

### TransferNoteItem

Stores empty-can rows inside a transfer note.

- `id` - primary key
- `mobileLocalId` - unique mobile UUID for idempotent sync
- `transferNoteId` - foreign key to `TransferNote`
- `canCode` - system can code
- `deletedAt` - soft-delete timestamp from offline sync
- `createdAt`, `updatedAt` - audit timestamps

### MobileSyncEvent

Stores each mobile sync attempt received by the web server for admin monitoring.

- `id` - primary key
- `employeeId` - optional foreign key to the field collector employee
- `status` - `Success` or `Failed`
- `issueNoteCount` - number of issue notes received in the sync payload
- `issueNoteItemCount` - number of issue note can rows received
- `transferNoteCount` - number of transfer notes received
- `transferNoteItemCount` - number of transfer note can rows received
- `errorMessage` - failure message when sync could not complete
- `startedAt`, `completedAt` - sync attempt timestamps
