# 🔍 Supabase Schema Inspector - Run dit in Supabase SQL Editor

## Stap 1: Check Riders Table Structure

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'riders' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Stap 2: Check Clubs Table Structure

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'clubs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Stap 3: Check Events Table Structure  

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Stap 4: Check Results Table Structure

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'results' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Stap 5: List All Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

---

## 📋 Run deze queries en geef mij de output!

Ik wil voor **riders** en **clubs** de exacte kolommen zien zodat ik de VIEW correct kan maken.
