# PostHog Events Schema

| Event Name | Location | Key Properties |
|-----------|----------|----------------|
| feed_viewed | PetStatusFeed.tsx | petId, eventCount, language |
| letter_sent | LetterEditor.tsx | petId, letterLength, language |
| letter_compose_started | LetterEditor.tsx | petId, starter_used |
| subscription_started | PricingSection.tsx | planId, billingInterval |
| feed_generated | generate-event/route.ts (server) | petId, eventType, language |
