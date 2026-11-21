# Security Specification — J Smart Services Angola

## 1. Data Invariants
1. **Authentication Identity**: Every write/private read requires a verified `request.auth != null` Firebase Auth identity (`uid`), except intentionally denied collections (`recovery_otps`) which are server-only (`if false`).
2. **Admin Authority (`isAdmin()`)**: Only a verified Firebase Auth Super Admin (`email == 'jfigueiredo790@gmail.com' && email_verified == true`) or a user whose UID exists in `/admins/{uid}` or `/administradores/{uid}` (or whose `/users/{uid}` document already has `role == 'admin'`) has administrative privileges. Regular users cannot self-assign `role: 'admin'`, `adminSubRole`, `blocked`, or `subscriptionPlan` in `/users` or `/professionals`.
3. **PII Isolation**: Private user fields (`email`, `phone`, `documentNumber`, `walletBalanceKz`, `address`) reside only in `/users/{userId}` and `/professionals/{proId}` (readable only by `isOwner` or `isAdmin()`). Public discovery uses `/professionals_public/{proId}` without PII. `service_requests` must not store `clientPhone`.
4. **No Plaintext Credentials**: `password`, `adminPin`, and `otpCode` must never be written to Firestore documents (`!('password' in data)`, `!('adminPin' in data)`).
5. **Private Chat & Request Exclusivity**:
   - `service_requests` can only be created by the authenticated `clientId == request.auth.uid`, accepted atomically by a non-owner professional when `status in ['pendente', 'novamente_disponivel']`, updated only by participants (`clientId` or assigned `professionalId`) or `isAdmin()`, and never updated once terminal (`concluido`, `cancelado`) except by `isAdmin()`.
   - `chat_messages` and `conversations` are readable/writable strictly by participants (`senderId`, `receiverId`, or `participants`) or `isAdmin()`.
6. **Financial Integrity**: Regular users can only create `wallet_transactions` with `userId == request.auth.uid`, `amountKz > 0`, and `status == 'pendente'`. Only `isAdmin()` can transition transactions to `concluido` or `rejeitado`, unlock paid plans, or modify `walletBalanceKz`.
7. **Immutable Audit Logs**: `admin_audit_logs` are readable and appendable only by `isAdmin()`, and never updatable or deletable (`allow update, delete: if false`).
8. **Server-Only Recovery Sessions**: `recovery_otps` are locked down (`allow read, write: if false`) for all client SDK access.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated PII Read**: Unauthenticated client reading `/users/{uid}` or `/professionals/{uid}` -> **DENIED**.
2. **Cross-User PII Read**: Authenticated User A reading `/users/{userB}` or `/professionals/{userB}` -> **DENIED**.
3. **Self-Admin Privilege Escalation (Create)**: User A creating `/users/{userA}` with `{ role: 'admin', walletBalanceKz: 999999 }` -> **DENIED**.
4. **Shadow Role/Wallet Update**: User A updating `/users/{userA}` with `{ role: 'admin' }` or `{ walletBalanceKz: 500000 }` or `{ subscriptionPlan: 'plan_30d' }` -> **DENIED**.
5. **Plaintext Credential Injection**: User A writing `{ password: '...' }` into `/users/{userA}` or `{ adminPin: '...' }` into `/platform_settings/global_config` -> **DENIED**.
6. **Unverified Admin Email Spoof**: User with `email: 'jfigueiredo790@gmail.com'` and `email_verified: false` attempting admin write -> **DENIED**.
7. **Chat Snooping**: Authenticated User C (non-participant) reading `/chat_messages/{msgId}` or `/conversations/{convId}` between User A and Pro B -> **DENIED**.
8. **Client-Side Self-Approval Payment**: User A creating `/wallet_transactions/{txId}` with `{ status: 'concluido', amountKz: 100000 }` -> **DENIED**.
9. **Request Hijacking**: Pro B updating an already `aceito` request owned by Client A and Pro A to steal `professionalId` -> **DENIED**.
10. **Terminal State Tampering**: Client or Pro updating a `concluido` or `cancelado` service request -> **DENIED**.
11. **OTP Session Harvesting**: Any client reading or writing `/recovery_otps/{sessionId}` -> **DENIED**.
12. **Audit Log Tampering**: Even an Admin attempting `update` or `delete` on `/admin_audit_logs/{logId}` -> **DENIED**.
