# Violation Detection Test Cases

This document captures the current Sprint 2 functional test coverage for the investigator-facing Violation List workflow.

## eBay Sandbox Sample Listings

Use these sample listings in the eBay Sandbox marketplace to validate shortlist-based violation detection:

| Listing Title | Product Name Match | Manufacturer | Quantity | Suggested Seller Username | Expected Result |
|---|---|---|---:|---|---|
| AromaGlow Candle Warmer Lamp by WarmLight | AromaGlow Candle Warmer Lamp | WarmLight | 1 | `sandbox-warmlight-01` | Imported as a new violation when the shortlist search runs |
| SummitTrek Waterproof Hiking Boots - TrailBound | SummitTrek Waterproof Hiking Boots | TrailBound | 1 | `sandbox-trailbound-01` | Imported as a new violation when the shortlist search runs |
| AromaGlow Decorative Desk Lamp | Partial product-name overlap only | WarmLight | 1 | `sandbox-false-positive-01` | Should only be imported if the listing clears the configured match threshold |
| SummitTrek Waterproof Hiking Boots - Duplicate Listing | SummitTrek Waterproof Hiking Boots | TrailBound | 1 | `sandbox-trailbound-duplicate` | Should not create a second violation if the same listing already exists |

## Functional Test Cases

### 1. Search shortlisted recalls against eBay
- Preconditions: The shortlist contains the recalled products `AromaGlow Candle Warmer Lamp` and `SummitTrek Waterproof Hiking Boots`.
- Steps:
  1. Log in as an investigator.
  2. Open the `Violation List` page.
  3. Click `Search for Violations`.
- Expected result:
  - A modal titled `Search Complete` appears.
  - The modal text shows `The number of new violations found is: x`.
  - New violations appear in the list with `Unresolved` status and blank violation descriptions.

### 2. Prevent duplicate violation inserts
- Preconditions: At least one matching eBay Sandbox listing has already been imported into the violation list.
- Steps:
  1. Click `Search for Violations` again without changing the Sandbox data.
- Expected result:
  - The search completes successfully.
  - Existing recall/listing pairs are not duplicated in the database.
  - The number of new violations found only reflects net-new matches.

### 3. Edit violation confirmation, description, and status
- Preconditions: A violation exists in the Violation List.
- Steps:
  1. Click `Edit` on the violation.
  2. Change `Match Confirmation` to `False`.
  3. Enter a reason in `Violation Description`.
  4. Change `Status` to `Resolved`.
  5. Submit the form.
- Expected result:
  - The edit form closes successfully.
  - The updated values appear immediately in the Violation List.
  - The violation now counts toward the resolved metrics in Analytics.

### 4. Enforce the 500-character description limit
- Preconditions: A violation exists in the Violation List.
- Steps:
  1. Click `Edit`.
  2. Paste a violation description longer than 500 characters.
- Expected result:
  - The form shows a character-limit warning.
  - The save button remains disabled until the description is 500 characters or fewer.

### 5. Allow deletion only after resolution
- Preconditions: One unresolved violation and one resolved violation exist.
- Steps:
  1. Verify the unresolved violation's `Delete` button is disabled.
  2. Click `Delete` on the resolved violation and confirm the action.
- Expected result:
  - The unresolved violation cannot be deleted.
  - The resolved violation is removed from the list and database.

## Required Violation Fields

The current workflow treats the following fields as required for a complete violation record:

- `violationID`
- `recallID`
- `productName`
- `marketplaceSource`
- `sellerID` or seller identity from the imported listing
- `violationDate`
- `violationDescription`
- `status`
