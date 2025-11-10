#!/bin/bash

# Script om een admin user aan te maken in Supabase
# Dit script gebruikt de Supabase Management API

SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU"

# Admin user credentials
ADMIN_EMAIL="admin@cloudracer.nl"
ADMIN_PASSWORD="CloudRacer2024!"

echo "🔐 Creating admin user in Supabase..."
echo "Email: $ADMIN_EMAIL"

# Create user via Supabase Auth Admin API
curl -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"${ADMIN_PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"role\": \"admin\",
      \"name\": \"CloudRacer Admin\"
    }
  }" | jq '.'

echo ""
echo "✅ Admin user created!"
echo "Login credentials:"
echo "  Email: $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""
echo "Test de login op: http://localhost:5173"
