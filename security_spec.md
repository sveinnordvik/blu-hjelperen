# Security Specification - BLU-Hjelperen

## Data Invariants
1. A document or project MUST belong to a valid user and can only be accessed by its owner or a verified administrator.
2. User profile data is private to the owner and administrators.
3. Context files are personal and can only be managed by the uploading user.
4. Timestamps (updatedAt, createdAt) should ideally be server-managed.

## The "Dirty Dozen" Payloads (Attacks)

### Attack 1: Identity Spoofing (Create Project for Proxy)
```json
{
  "userId": "victim_uid_123",
  "milestones": []
}
```
*Expected: PERMISSION_DENIED (UID must match request.auth.uid)*

### Attack 2: Cross-User Read (Access another user's document)
*Request: GET /users/victim_123/documents/main*
*Expected: PERMISSION_DENIED*

### Attack 3: Shadow Update (Injecting admin role)
```json
{
  "uid": "attacker_uid",
  "email": "attacker@example.com",
  "role": "admin"
}
```
*Expected: PERMISSION_DENIED (Only existing admins can promote others)*

### Attack 4: Large Document Pollution (Denial of Wallet)
```json
{
  "title": "A".repeat(1000),
  "userId": "attacker_uid"
}
```
*Expected: PERMISSION_DENIED (Size check failed)*

### Attack 5: Context File Hijacking (Update userId)
```json
{
  "userId": "attacker_uid",
  "name": "hacked.pdf"
}
```
*Expected: PERMISSION_DENIED (userId is immutable)*

### Attack 6: Orphaned Chat History (Create without user reference)
*Request: CREATE /users/nonexistent/chatHistory/main*
*Expected: PERMISSION_DENIED*

### Attack 7: Terminal State Bypass (Resetting pricingTier from client)
```json
{
  "pricingTier": "preview"
}
```
*Expected: PERMISSION_DENIED (Protected Tier Change)*

### Attack 8: Unauthenticated Write (Public access to context_files)
*Request: CREATE /context_files/test as Anonymous*
*Expected: PERMISSION_DENIED*

### Attack 9: Malformed ID injection
*Request: CREATE /users/user-with-@@-id*
*Expected: PERMISSION_DENIED (Regex check)*

### Attack 10: Array size exhaustion
```json
{
  "milestones": [{"id": "1"}, {"id": "2"}, ... 500 more]
}
```
*Expected: PERMISSION_DENIED (Size limit check)*

### Attack 11: PII Blanket Read (Querying /users/)
*Request: LIST /users/*
*Expected: PERMISSION_DENIED (No top-level list allowed)*

### Attack 12: Invalid Type Injection
```json
{
  "title": 12345
}
```
*Expected: PERMISSION_DENIED (Type check failed)*
