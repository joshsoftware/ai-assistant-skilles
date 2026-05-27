

## Prompt to generate the service boilerplate code.

---

### Service used in prompt : Mock Bank Service



I want to generate a production-ready Spring Boot service for a Mock Bank API
following Josh Software standards. Use the /boilerplate skill for all code generation.

Before writing any code, ask me the following questions one by one and wait for
my answers:

1. Build tool — Gradle or Maven?
2. Config format — application.yml or application.properties?
3. Do you want JWT authentication set up now?
4. Do you want pagination on list APIs (e.g. transaction history)?
5. Who is the author? (used in all class-level comments)

  ---

## Service Overview

Mock Bank API — a backend service simulating core banking operations.

### Domains to generate (each as a full module):

1. **Customer** — name, email, phone, address, KYC status, created/updated timestamps

Before writing any code, ask me the following questions one by one and wait for
my answers:

1. Build tool — Gradle or Maven?
2. Config format — application.yml or application.properties?
3. Do you want JWT authentication set up now?
4. Do you want pagination on list APIs (e.g. transaction history)?
5. Who is the author? (used in all class-level comments)

  ---

## Service Overview

Mock Bank API — a backend service simulating core banking operations.

### Domains to generate (each as a full module):

1. **Customer** — name, email, phone, address, KYC status, created/updated timestamps
2. **Account** — accountNumber, accountType (SAVINGS/CURRENT/FIXED_DEPOSIT),
   balance, currency, status (ACTIVE/INACTIVE/FROZEN), linked to Customer
3. **Transaction** — transactionId, type (CREDIT/DEBIT/TRANSFER), amount,
   description, status (PENDING/SUCCESS/FAILED), fromAccount, toAccount, timestamp
4. **Payment** — paymentReference, paymentMode (UPI/NEFT/IMPS/RTGS),
   amount, status, linked to Transaction

### APIs required per domain:

**Customer**
- POST   /api/v1/customers         → create customer
- GET    /api/v1/customers         → list all customers
- PUT    /api/v1/customers/{id}    → update customer

**Account**
- POST   /api/v1/accounts              → create account (linked to customer)
- GET    /api/v1/accounts/{id}         → fetch account details
- GET    /api/v1/accounts/customer/{customerId} → get all accounts for a customer
- PATCH  /api/v1/accounts/{id}/status  → update account status (ACTIVE/INACTIVE/FROZEN)

**Transaction**
- GET    /api/v1/transactions/{id}              → fetch single transaction
- GET    /api/v1/transactions/account/{accountId} → get all transactions for an account

**Payment**
- POST   /api/v1/payments          → initiate a payment (debits fromAccount, credits toAccount)
- GET    /api/v1/payments/{id}     → fetch payment status
- GET    /api/v1/payments          → list all payments

  ---

## Mandatory Standards (apply to every class generated)

### Project Structure
- Packages: com.joshsoftware.mockbank.<layer>
- Enums go in: com.joshsoftware.mockbank.enums (top-level, NOT entity/enums)
- ApiResponse and ErrorResponse go in: dto/ package (NOT common/)
- No common/ package

### Author Comment (place above class annotations, not at top of file)
  ```java
  /**
   * author : <answer from question 5>
   **/
  @RestController   ← placed here
  public class XxxController {

  Entity Rules

  - No BaseEntity or @MappedSuperclass
  - No Spring auditing annotations (@CreatedDate, @LastModifiedDate etc.)
  - Every entity has: id (UUID), createdAt, updatedAt, createdBy, updatedBy as plain fields
  - Use LocalDateTime for createdAt/updatedAt — NOT Instant
  - createdAt/updatedAt have NO nullable = false constraint
  - Add @AllArgsConstructor and @NoArgsConstructor to every entity
  - Enums: @Getter + private final String value field + constructor

  DTO Rules

  - DTOs are POJO classes with @Getter @Setter — NOT Java records
  - Naming: always suffix with DTO → CreateCustomerRequestDTO, CustomerResponseDTO
  - Request DTOs: validation annotations with custom messages
  - Response DTOs: use LocalDateTime, not Instant

  Constants Rules
  
  - Constants class must be an interface (not final class)
  - Fields are implicitly public static final — no keywords needed

  Controller Rules

  - NO @Validated on controller class
  - Create APIs use ResponseEntity.ok() — not ResponseEntity.status(201)
  - No pagination unless I answered yes to question 4
  - @RequiredArgsConstructor for dependency injection

  Service Rules
  
  - @Transactional ONLY on write methods (create, update, delete, payment initiation)
  - NO @Transactional on simple reads (findById, findAll, findByXxx)
  - Set createdAt = LocalDateTime.now() and updatedAt = LocalDateTime.now()
  via MapStruct mapper expression in toEntity
  - Set updatedAt = LocalDateTime.now() via mapper expression in updateEntityFromRequest
  - Variable naming: createdCustomer / updatedAccount (never "saved" or "updated" alone)
  - One-line comment above each public service method describing what it does

  Repository Rules

  - NO comments inside repository interface
  - Return List for list methods (not Page unless pagination was confirmed)

  ApiResponse shape

  @Getter @Setter @Builder
  public class ApiResponse<T> {
      private int status;
      private String message;
      private T data;
      // Only: success(message, data) and error(status, message)
      // NO created() method
  }

  Mapper Rules

  - Use MapStruct with componentModel = "spring"
  - NullValuePropertyMappingStrategy.IGNORE for partial updates
  - createdAt/updatedAt set via: expression = "java(LocalDateTime.now())"

  ---
  Generate the complete service layer by layer in this order:
  1. Enums
  2. Entities
  3. DTOs (request + response)
  4. Constants interfaces
  5. Repositories
  6. Mappers
  7. Service interfaces + ServiceImpl
  8. Controllers
  9. GlobalExceptionHandler + custom exceptions
  10. application.yml / application.properties (based on my answer)
  11. build.gradle or pom.xml dependency block 
  
  Generate one domain at a time. Start with Customer, confirm before moving to Account,
  then Transaction, then Payment.
