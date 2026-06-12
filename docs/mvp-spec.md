# KAPOOL MVP Specification

## Objective

Define the first real development baseline for KAPOOL so frontend and backend can build against the same scope, data model, and screen behavior.

This document is for the MVP only. It is not a full production specification.

## Product Goal

KAPOOL helps Kunsan University students coordinate campus carpool rides with a simple mobile-first flow:

- browse available rides
- request or reserve a seat
- register a new ride as a driver
- communicate through ride chat
- view and manage basic user profile information

## MVP Scope

### In Scope

- student sign-in and sign-up flow
- ride list browsing
- ride detail view
- seat reservation request flow
- ride registration flow
- per-ride chat room
- basic profile view
- simple status updates for rides and reservations

### Out of Scope

- payment processing
- map SDK integration
- push notifications
- admin dashboard
- native app packaging
- advanced search ranking
- real-time matching algorithm

## Primary User Types

### Passenger

- can browse rides
- can request or reserve a seat
- can join ride chat

### Driver

- can create a ride
- can approve or reject passenger requests
- can share ride information in chat

## Core User Flows

### 1. Authentication

- user signs up with school-oriented identity fields
- user signs in
- user reaches home screen after successful authentication

### 2. Ride Browsing

- user lands on home screen
- user filters by region and date
- user sees ride cards with departure, destination, time, seats, fare, and status
- user taps a ride card to open ride detail

### 3. Ride Reservation

- user opens ride detail
- user checks driver, route, time, fare, and seat state
- user requests reservation
- system records request with pending or confirmed state depending on policy

### 4. Ride Registration

- driver opens register screen
- driver enters departure region, destination, time, seat count, fare, and optional waypoint notes
- system creates a new ride in open state

### 5. Ride Chat

- user enters ride-specific chat room
- participants exchange simple text messages
- system messages may expose approved ride info such as vehicle or pickup guidance

### 6. Profile

- user views nickname, department, frequently used route hints, and participation summary
- user can log out

## Frontend Screen Specification

### Login Screen

Purpose:
- entry point for authentication

Required states:
- default
- sign-in submit loading
- sign-in error
- sign-up entry path

### Home Screen

Purpose:
- show available rides and rider requests

Required sections:
- top summary header
- region filter
- date filter
- ride list
- rider request list

Required states:
- default list
- empty list
- loading list
- fetch error

### Detail Screen

Purpose:
- show ride-specific information and allow reservation/chat entry

Required states:
- open ride
- full ride
- closed ride
- invalid ride or deleted ride

### Chat Screen

Purpose:
- show ride conversation

Required states:
- message list
- empty chat
- send pending
- send failure

### Register Screen

Purpose:
- create a new ride

Required states:
- default form
- validation error
- submit loading
- submit success
- submit failure

### Profile Screen

Purpose:
- show account summary and logout action

Required states:
- default
- profile load failure

## Backend Domain Specification

### User

Fields:
- `id`
- `studentId`
- `name`
- `nickname`
- `department`
- `phone` or masked contact policy
- `role` (`passenger`, `driver`, `both`)
- `createdAt`

### Ride

Fields:
- `id`
- `driverId`
- `fromRegion`
- `toRegion`
- `departureTime`
- `seatCapacity`
- `seatAvailable`
- `fare`
- `status` (`open`, `full`, `closed`)
- `waypoints`
- `vehicleNote`
- `createdAt`

### Reservation

Fields:
- `id`
- `rideId`
- `passengerId`
- `status` (`pending`, `approved`, `rejected`, `cancelled`)
- `message`
- `createdAt`

### RideRequest

Fields:
- `id`
- `authorId`
- `fromRegion`
- `toRegion`
- `timeNote`
- `content`
- `status`
- `createdAt`

### ChatRoom

Fields:
- `id`
- `rideId`
- `createdAt`

### ChatMessage

Fields:
- `id`
- `chatRoomId`
- `senderId`
- `type` (`system`, `text`)
- `text`
- `createdAt`

## MVP API Draft

### Auth

- `POST /auth/sign-up`
- `POST /auth/sign-in`
- `POST /auth/sign-out`
- `GET /me`

### Rides

- `GET /rides`
- `GET /rides/:rideId`
- `POST /rides`
- `PATCH /rides/:rideId/status`

### Reservations

- `POST /rides/:rideId/reservations`
- `GET /rides/:rideId/reservations`
- `PATCH /reservations/:reservationId`

### Rider Requests

- `GET /ride-requests`
- `POST /ride-requests`

### Chat

- `GET /rides/:rideId/chat/messages`
- `POST /rides/:rideId/chat/messages`

### Profile

- `GET /profile`

## Frontend State Rules

- Authentication state must determine whether login screen or app screens are shown.
- Current `App.tsx` in-memory navigation is acceptable only until route requirements are confirmed.
- Mock data in `src/lib/theme.ts` should remain the temporary source of truth until real API contracts are approved.
- UI components in `src/components/` should remain presentational where possible.
- Screen-specific API calls and composition should live in `src/screens/` or screen-adjacent hooks when introduced.

## Acceptance Criteria For MVP Spec

This specification is usable when all of the following are true:

- FE can identify which screens must be built first.
- BE can identify which entities and endpoints must exist first.
- both sides can agree on ride, reservation, and chat status shapes.
- current prototype screens can be mapped directly to real implementation tasks.

## Open Decisions

These require explicit confirmation before implementation:

1. Authentication method
   - school email only
   - student number + password
   - social login plus student verification later

2. Reservation policy
   - instant approval
   - driver approval required

3. Chat delivery model
   - polling first
   - websocket first

4. Contact exposure policy
   - phone shown after approval
   - only in-app chat for MVP

5. Fare policy
   - fixed by region
   - driver editable within limits

## Recommended Next Work

### Step 1

Convert this MVP spec into an approved product decision set for:

- authentication method
- reservation approval policy
- chat model
- fare policy

### Step 2

Split this document into implementation-ready sub-specs if needed:

- frontend screen spec
- backend API spec
- database schema draft

### Step 3

Start implementation in this order:

1. auth flow skeleton
2. rides list and detail data contract
3. reservation flow
4. ride registration flow
5. chat flow
