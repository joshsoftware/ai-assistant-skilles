# Java Claude Skills — User Guide

A collection of Claude Code skills for generating production-ready Java Spring Boot services
following Josh Software and BFSI coding standards.

---

## Skills Available

| Skill                        | Trigger                        | Purpose                                                                                        |
|------------------------------|--------------------------------|------------------------------------------------------------------------------------------------|
| **Boilerplate**              | `/boilerplate`                 | Scaffold Spring Boot layers (Controller, Service, Repository, Entity, DTO, Mapper, etc.)       |
| **BFSI Standards**           | `/bfsi-standards`              | Enforce BFSI-grade data protection (PCI-DSS, RBI, UIDAI, DPDPA) on any feature                |
| **Microservice Communication** | `/microservice-communication` | Generate inter-service HTTP clients (RestClient, WebClient, OpenFeign) and async channels (Kafka, RabbitMQ) |

---

## How to Use Skills in a Prompt

Start your prompt by declaring which skills to activate. The AI reads the referenced skill files
before generating any code. Always invoke BFSI Standards alongside Boilerplate when the service
handles financial or personal data.

```
Use the /boilerplate skill for code generation.
Use the /bfsi-standards skill for all sensitive data and compliance requirements.
Use the /microservice-communication skill for inter-service calls.
```

---

## Questions Asked Per Skill

### /boilerplate — Questions Asked Before Code Generation

The boilerplate skill asks these questions **one at a time** and waits for your answer before proceeding:

1. **Build tool** — Gradle or Maven?
2. **Config format** — `application.yml` or `application.properties`?
3. **JWT authentication** — Do you want JWT set up now?
4. **Pagination** — Do you want pagination on list APIs?
5. **Author** — Who is the author? (placed in every class comment)
6. **Cloud storage** — Do you want cloud file storage (S3 / GCS)?

---

### /bfsi-standards — Questions Asked Before Code Generation

The BFSI skill asks these questions **one at a time** before generating any sensitive data handling:

1. **Domain** — Banking / Payments / Lending / Insurance / Wealth Management / KYC?
2. **Sensitive data types present** — Which of: PAN, CVV, Aadhaar, bank account, password, OTP, API key, PII (name/DOB/mobile/email), policy number, loan account?
3. **Custom annotations** — Do you want `@SensitiveData`, `@MaskField`, `@Audited` annotations?
   - If yes: which of the three?
4. **Data masking** — Do you need `MaskingUtil` for logs and responses?
   - If yes: which data types need masking methods? Add Logback scrubbing filter?
5. **Secret management** — Do you need credentials kept out of source code?
   - If yes: Vault / AWS Secrets Manager / env vars only? Which secret categories?
6. **Field-level encryption** — Do you need JPA `AttributeConverter` for encrypted DB columns?
   - If yes: which fields (PAN / Aadhaar / account number / other)? Generate Flyway migration?
7. **Audit logging** — Do you need a BFSI audit trail?
   - If yes: which operations? AOP annotation or manual calls? Generate migration?

---

### /microservice-communication — Questions Asked Before Code Generation

The microservice communication skill asks these questions **one at a time**:

1. **Communication style** — Synchronous / Asynchronous / Both?
2. **Synchronous client** *(if sync)* — RestClient (Spring Boot 3.2+) / WebClient (reactive) / OpenFeign (declarative)?
   - Follow-up: target service name and base URL config key? Which HTTP operations (GET / POST / PUT / DELETE)?
3. **Async broker** *(if async)* — Kafka / RabbitMQ / AWS SQS?
   - Kafka follow-up: topic name, consumer group ID, DLT needed, transactional producer?
   - RabbitMQ follow-up: exchange name, routing key, queue name, DLQ needed, exchange type?
4. **Resilience patterns** — Circuit breaker / Retry / Timeout / Bulkhead / Rate limiter?
   - Follow-up: annotation-based or programmatic?
5. **Auth header propagation** — JWT pass-through / service API key / OAuth2 client credentials / none?
6. **Service discovery** — Eureka / Consul / Kubernetes DNS / static config?
7. **Distributed tracing** — Zipkin / Jaeger / none?

> **Note:** RestTemplate is in maintenance mode. The skill always generates RestClient, WebClient, or OpenFeign — never RestTemplate.

---

## Example Prompt — Credit Card Service

---

### Service: Credit Card Management System

I want to generate a production-ready **Credit Card Service** following Josh Software standards.

Use the **/boilerplate skill** for all code generation.
Use the **/bfsi-standards skill** for all sensitive data, security, and compliance requirements.

Before writing any code, ask me the required questions from both skills **one at a time** and wait for my answers. Do not generate any code until all questions from both skills are answered.

---

#### Service Overview

A backend service for end-to-end credit card lifecycle management — from card application to billing and payment.
Domain: **Payments / Banking** (PCI-DSS + RBI standards apply).

---

#### Domains to Generate

Each domain is a full module: Entity, DTO (Request + Response), Repository, Service interface + ServiceImpl, Controller, MapStruct Mapper, Enums, and Constants.

**1. CardApplication**
Fields: `id (UUID)`, `customerId (UUID)`, `applicantName`, `annualIncome (BigDecimal)`, `requestedLimit (BigDecimal)`, `applicationStatus (PENDING / APPROVED / REJECTED)`, `rejectionReason`, `appliedAt (LocalDateTime)`, `reviewedAt (LocalDateTime)`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

**2. Card**
Fields: `id (UUID)`, `applicationId (UUID)`, `customerId (UUID)`, `cardNumberEncrypted` (store AES-encrypted; display as masked `XXXX-XXXX-XXXX-1234`), `cvvEncrypted` (AES-encrypted; never returned in any API response), `expiryMonth`, `expiryYear`, `cardHolderName`, `cardStatus (INACTIVE / ACTIVE / BLOCKED / DEACTIVATED)`, `cardType (VISA / MASTERCARD / RUPAY)`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

**3. CreditLimit**
Fields: `id (UUID)`, `cardId (UUID)`, `totalLimit (BigDecimal)`, `availableLimit (BigDecimal)`, `usedLimit (BigDecimal)`, `dailyLimit (BigDecimal)`, `monthlyLimit (BigDecimal)`, `dailyUsed (BigDecimal)`, `monthlyUsed (BigDecimal)`, `lastResetDate (LocalDate)`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

**4. CardTransaction**
Fields: `id (UUID)`, `cardId (UUID)`, `transactionType (PURCHASE / REFUND / EMI_DEBIT)`, `amount (BigDecimal)`, `merchantName`, `transactionStatus (PENDING / SUCCESS / FAILED / REVERSED)`, `failureReason`, `referenceNumber`, `transactionAt (LocalDateTime)`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

**5. BillingStatement**
Fields: `id (UUID)`, `cardId (UUID)`, `billingCycleStart (LocalDate)`, `billingCycleEnd (LocalDate)`, `dueDate (LocalDate)`, `totalDue (BigDecimal)`, `minimumDue (BigDecimal)`, `outstandingAmount (BigDecimal)`, `interestCharged (BigDecimal)`, `lateFee (BigDecimal)`, `statementStatus (GENERATED / PAID / PARTIALLY_PAID / OVERDUE)`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

**6. CardPayment**
Fields: `id (UUID)`, `cardId (UUID)`, `statementId (UUID)`, `amountPaid (BigDecimal)`, `paymentType (FULL / PARTIAL / MINIMUM)`, `paymentMode (UPI / NEFT / IMPS / RTGS)`, `paymentStatus (PENDING / SUCCESS / FAILED)`, `paidAt (LocalDateTime)`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

**7. EmiSchedule**
Fields: `id (UUID)`, `transactionId (UUID)`, `cardId (UUID)`, `totalAmount (BigDecimal)`, `emiAmount (BigDecimal)`, `tenureMonths (int)`, `interestRate (BigDecimal)`, `emiStatus (ACTIVE / COMPLETED / FORECLOSED)`, `startDate (LocalDate)`, `nextDueDate (LocalDate)`, `paidInstallments (int)`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

---

#### Business Logic to Implement (in ServiceImpl)

- **Card application approval** — approve if `annualIncome >= 300000`; reject otherwise; set `applicationStatus` and `reviewedAt`
- **Card number generation** — generate a 16-digit Luhn-valid number; store AES-encrypted in DB; return masked (`XXXX-XXXX-XXXX-last4`) in all responses
- **CVV generation** — generate a 3-digit CVV; store AES-encrypted in DB; never return in any API response
- **Expiry date** — set to 3 years from card creation date
- **Credit limit deduction** — on each PURCHASE transaction, deduct from `availableLimit` and add to `usedLimit`, `dailyUsed`, `monthlyUsed`
- **Limit validation** — before processing a PURCHASE: validate card is ACTIVE, `availableLimit >= amount`, `dailyUsed + amount <= dailyLimit`, `monthlyUsed + amount <= monthlyLimit`
- **Refund processing** — restore `availableLimit` and reduce `usedLimit` on REFUND
- **Monthly statement generation** — calculate `totalDue = outstandingAmount + interestCharged`; `minimumDue = max(500, totalDue * 0.05)`; `dueDate = billingCycleEnd + 20 days`
- **Interest calculation** — monthly rate = 3.5%; apply only on outstanding amount after grace period (20 days post due date)
- **Late fee** — charge flat ₹500 if payment not received within 3 days after due date
- **Penalty interest** — additional 2% per month on overdue amount beyond late fee threshold
- **EMI conversion** — convert a completed PURCHASE transaction to EMI; generate monthly `emiAmount = (principal * rate * (1+rate)^n) / ((1+rate)^n - 1)`; create one `EmiSchedule` record per installment month
- **Bill payment** — reduce `outstandingAmount` on `BillingStatement`; update `statementStatus` to PAID / PARTIALLY_PAID based on amount paid; update `availableLimit` accordingly

---

#### BFSI Security Requirements (apply automatically — no opt-in needed)

- `cardNumberEncrypted` — stored AES-256-GCM encrypted; always returned as masked (`XXXX-XXXX-XXXX-1234`) in every response DTO
- `cvvEncrypted` — stored AES-256-GCM encrypted; **never** included in any response DTO or log
- All logs involving card or customer data must use `MaskingUtil` — raw card number or CVV must never appear in any log line
- `@SensitiveData` annotation on `cardNumberEncrypted` and `cvvEncrypted` fields in the entity
- `@ToString.Exclude` on all sensitive fields
- `@JsonIgnore` on `cvvEncrypted` in every DTO
- OTP-based transaction auth — generate a 6-digit mock OTP, log it only as `[REDACTED]`, validate before processing PURCHASE
- All secrets (AES key, DB password) in `application.yml` as `${ENV_VAR}` placeholders only
- Audit log entry on: card approval, card block/unblock, transaction processed, bill payment received

---

#### APIs to Expose

**Card APIs**
- `POST   /api/v1/cards/apply`               — submit card application
- `GET    /api/v1/cards/{id}`                — fetch card details (masked card number; no CVV)
- `PUT    /api/v1/cards/{id}/activate`       — activate a card
- `PUT    /api/v1/cards/{id}/block`          — block a card
- `PUT    /api/v1/cards/{id}/unblock`        — unblock a card
- `PUT    /api/v1/cards/{id}/limit`          — update daily / monthly limit

**Transaction APIs**
- `POST   /api/v1/transactions/pay`          — debit purchase (validates limit, status, OTP)
- `POST   /api/v1/transactions/refund`       — process refund for a prior transaction
- `GET    /api/v1/transactions?cardId=`      — list transactions for a card
- `POST   /api/v1/transactions/{id}/emi`     — convert a transaction to EMI

**Billing APIs**
- `GET    /api/v1/statements?cardId=`        — fetch all statements for a card
- `GET    /api/v1/statements/{id}`           — fetch single statement
- `POST   /api/v1/statements/generate`       — trigger monthly statement generation (admin)
- `POST   /api/v1/bill/pay`                  — pay credit card bill (full / partial / minimum)

---

#### Mandatory Standards

**Project Structure**
- Base package: `com.joshsoftware.creditcard`
- Enums in: `com.joshsoftware.creditcard.enums` (never inside entity sub-packages)
- `ApiResponse` and `ErrorResponse` in: `dto/` package (not `common/`)
- Sensitive converters in: `converter/` package
- Masking utility in: `util/MaskingUtil.java`

**Entity Rules**
- No `BaseEntity` or `@MappedSuperclass`
- No Spring auditing annotations (`@CreatedDate`, `@LastModifiedDate`)
- Every entity has: `id (UUID)`, `createdAt (LocalDateTime)`, `updatedAt (LocalDateTime)`, `createdBy`, `updatedBy` as plain fields
- Add `@AllArgsConstructor` and `@NoArgsConstructor` to every entity
- Enums: `@Getter` + `private final String value` field + constructor

**DTO Rules**
- DTOs are POJO classes with `@Getter @Setter` — not Java records
- Naming: always suffix with `DTO` — `ApplyCardRequestDTO`, `CardResponseDTO`
- Request DTOs: validation annotations with custom messages
- Response DTOs: use `LocalDateTime`, not `Instant`
- `CardResponseDTO` must include `maskedCardNumber`; must never include `cvv` or `cvvEncrypted`

**Controller Rules**
- No `@Validated` on the controller class
- Create APIs use `ResponseEntity.ok()` — not `ResponseEntity.status(201)`
- `@RequiredArgsConstructor` for dependency injection

**Service Rules**
- `@Transactional` only on write methods (apply, approve, block, transaction, payment)
- No `@Transactional` on simple reads (`findById`, `findAll`)
- Set `createdAt = LocalDateTime.now()` and `updatedAt = LocalDateTime.now()` via MapStruct `expression`
- One-line comment above each public service method describing what it does

**Constants Rules**
- Constants class must be an `interface` (not a final class)
- Fields are implicitly `public static final` — do not add these keywords

---

#### Generation Order

Generate one domain at a time, in this sequence. Confirm before moving to the next:

1. Enums (all at once: `ApplicationStatus`, `CardStatus`, `CardType`, `TransactionType`, `TransactionStatus`, `StatementStatus`, `PaymentType`, `PaymentMode`, `EmiStatus`)
2. CardApplication (full module)
3. Card + CreditLimit (together — they are created in one flow)
4. CardTransaction
5. BillingStatement
6. CardPayment
7. EmiSchedule
8. GlobalExceptionHandler + custom exceptions
9. `application.yml` + `build.gradle` dependency block
