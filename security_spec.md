# Awareness Global Movement - Security Specification

## 1. Data Invariants
1. **Initial Top Admin Identity**: Initial Top Admin authority is strictly bound to Firebase Auth UID `Bo6cQS55HedBDEADJtcdTyaHqNa2`.
2. **Role Hierarchy**: `TOP_ADMIN` > `ADMIN` > `REGISTERED_USER`.
3. **No Self-Elevation**: Regular users and `ADMIN` accounts can never elevate themselves or change their own role to `TOP_ADMIN`.
4. **No Direct Point or Metric Tampering**: Only authorized administrator reviews and trusted backend services can increment verified actions, award points, or alter official impact totals (bags avoided, CO2e avoided).
5. **No Proof Self-Approval**: Proof submissions created by users must start with status `PENDING`, `pointsAwarded: 0`, and no reviewer identity. Administrators cannot review their own submissions.
6. **One-Time Bootstrap**: The server-side bootstrap secret (`BOOTSTRAP_SECRET`) is never exposed in frontend code, Firestore, HTML, or logs. Once bootstrapped, the endpoint refuses further initialization.
7. **Immutable Audit Logs**: Sensitive administrator operations (`TOP_ADMIN_ADDED_ADMIN`, `ADMIN_DEACTIVATED`, `PROOF_APPROVED`, `PROOF_REJECTED`, `CHALLENGE_CREATED`, `CHALLENGE_UPDATED`, `PRIZE_CREATED`, `PRIZE_UPDATED`, `SETTINGS_UPDATED`) create append-only audit records that cannot be modified or deleted.

## 2. The "Dirty Dozen" Attack Payloads & Security Defenses
1. **Self-Promotion to TOP_ADMIN**: An attacker creates a profile with `role: "TOP_ADMIN"`.
   * *Result*: PERMISSION_DENIED (`request.resource.data.role == 'REGISTERED_USER'` enforced).
2. **Awarding Points on Submission Creation**: An attacker submits a proof with `status: "APPROVED"` and `pointsAwarded: 1000`.
   * *Result*: PERMISSION_DENIED (`status == 'PENDING'` and `pointsAwarded == 0` enforced).
3. **Profile Modification Escalation**: An attacker attempts to update their own `role` or `verifiedPoints` via client SDK.
   * *Result*: PERMISSION_DENIED (`affectedKeys().hasOnly(['fullName', 'profileImageUrl'])` enforced).
4. **Self-Review by Admin**: An administrator attempts to approve their own submitted proof.
   * *Result*: PERMISSION_DENIED (`resource.data.userId != request.auth.uid` enforced on review updates).
5. **Unauthorized Challenge/Prize Modification**: A regular user attempts to edit challenges or prizes.
   * *Result*: PERMISSION_DENIED (`isTopAdmin()` enforced for write).
6. **Audit Log Deletion**: An administrator attempts to delete an audit trail document.
   * *Result*: PERMISSION_DENIED (`allow update, delete: if false;` enforced).
7. **ID Token Spoofing on Bootstrap**: An unauthenticated user calls `/api/auth/claim-top-admin`.
   * *Result*: 401 Unauthorized / 403 Forbidden.
8. **Bootstrap Secret Brute Force**: An attacker makes repeated guesses to `/api/auth/claim-top-admin`.
   * *Result*: 429 Too Many Requests via rate limiting and safe timing comparison.
9. **Rogue Admin Creation**: A standard `ADMIN` attempts to create another `TOP_ADMIN`.
   * *Result*: PERMISSION_DENIED (`isTopAdmin()` required on `/admins/{adminId}`).
10. **Impact Settings Alteration**: A non-Top Admin writes to `/settings/impact`.
    * *Result*: PERMISSION_DENIED (`isTopAdmin()` enforced).
11. **Foreign Proof Creation**: An attacker attempts to create a submission under another user's UID (`userId != request.auth.uid`).
    * *Result*: PERMISSION_DENIED (`request.resource.data.userId == request.auth.uid` enforced).
12. **Blanket Read Harvesting**: An unauthenticated client attempts to query all submissions.
    * *Result*: PERMISSION_DENIED (`isSignedIn()` and owner/admin check enforced).
