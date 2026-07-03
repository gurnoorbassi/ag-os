# Product Project Policy

## Purpose

This document defines how AG OS treats existing and future product projects without mixing product-specific rules into the core Constitution.

## Product Boundary

AG OS is the operating system. Product projects are governed by AG OS but are not part of AG OS core.

## Lead Gen Posture

Lead Gen is an existing finished production project, not a future build.

Known posture:

- Source currently on the owner's local computer.
- Runtime on Hetzner VPS.
- Existing Postgres.
- Existing n8n.
- Existing domain.
- No GitHub repo yet unless the owner creates or imports one later.

## Lead Gen Control Path

Allowed control stages:

1. `observe`
2. `read_only`
3. `managed_staging`
4. `production_managed`

Default stage is `observe` or `read_only` until the owner approves promotion.

AG OS must not modify Lead Gen code, database, n8n workflows, domain, runtime, or production behavior until promotion gates are complete.

## Lead Gen Production Management Gates

Promotion to `production_managed` requires:

- Full backup.
- Rollback plan.
- Source control.
- n8n workflow exports.
- Database backup.
- Known-good version.
- Health checks.
- Approval lock.
- Audit log.

## AI Receptionist Posture

AI Receptionist is a separate product project, not part of AG OS core.

AG OS may manage AI Receptionist as a project after an approved project record exists. AI Receptionist product rules must not be mixed into the AG OS Constitution.

## Product Migration Rule

Each product migration must be scoped, reversible, owner-approved, and separated from live deployment, database, DNS, workflow activation, or production-data work unless those actions are explicitly approved.
