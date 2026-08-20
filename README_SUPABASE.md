# BALI Booking — Supabase/PostgreSQL edition

This branch replaces the former Google Apps Script / Google Sheets runtime with a database-first architecture.

## Runtime

`Web / iOS Web Clip / Android / Windows -> Supabase Edge API -> PostgreSQL`

Google Apps Script and Google Sheets are no longer required by the new runtime.

## Production services

- Supabase project: `BALI Mobile`
- Region: `eu-central-1`
- Booking API: `https://mvnxfouyoynqyjdpcblh.supabase.co/functions/v1/bali-booking-api`
- Booking app: `https://mvnxfouyoynqyjdpcblh.supabase.co/functions/v1/bali-booking-app`
- Guest booking: `https://mvnxfouyoynqyjdpcblh.supabase.co/functions/v1/bali-booking-app?mode=guest`

## Database namespace

Booking-specific tables use the `bb_` prefix so this subsystem is isolated from the other BALI applications in the same Supabase project.

Main tables:

- `bb_events`
- `bb_layouts`
- `bb_layout_tables`
- `bb_event_tables`
- `bb_bookings`
- `bb_booking_tables`
- `bb_clients`
- `bb_client_notes`
- `bb_booking_history`
- `bb_guest_users`
- `bb_sessions`
- `bb_admin_devices`
- `bb_settings`

## Operational date

A nightclub shift can cross midnight. For example, a shift that starts `21 Aug 23:00` and finishes `22 Aug 06:00` belongs to business date `21 Aug`. Additional corporate/private/concert events remain independent events and can coexist on the same date.

## Authentication

The admin application does not use a daily password. An authorized device is provisioned once with a private device token. Only its SHA-256 hash is stored in `bb_admin_devices`. The raw device token must never be committed to this public repository.

Guests register with phone + password. Passwords are stored only as bcrypt hashes. Guest sessions are random tokens whose hashes are stored in the database.

## Concurrency

Table occupancy is enforced in PostgreSQL. The database functions used by the API are responsible for booking writes, cancellation, check-in and synchronizing an event's table set. Repeated clicks are additionally blocked by the UI, but database constraints remain the final protection against double booking.

## Migrated data

The initial migration copied the existing BALI Booking layouts, events, active bookings and customer records from the former Google Sheet into the `bb_` tables. New writes must go to PostgreSQL only.
