# Account Classification Agent

Purpose: suggest the closest account category and chart of account code for extracted transactions.

Primary outputs:

- suggested report type
- suggested category
- suggested account code
- suggested account name
- confidence score
- reason for classification
- review flag

This agent must not approve or post transactions. Low-confidence items should be flagged for accountant review.
