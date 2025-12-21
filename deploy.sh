#!/bin/bash

# Deploy script voor iPad drag-and-drop fix

echo "🚀 Starting deployment process..."

# Stage changes
echo "📦 Staging changes..."
git add frontend/src/components/RiderPassportSidebar.tsx
git add frontend/src/components/TeamCard.tsx
git add frontend/src/pages/IntegratedTeamBuilder.tsx
git add frontend/src/pages/TeamViewer.tsx
git add frontend/src/index.css

# Commit
echo "💾 Committing changes..."
git commit -m "fix: implementeer @dnd-kit voor iPad touch support

- Voeg DndContext wrapper toe aan IntegratedTeamBuilder met TouchSensor en PointerSensor
- Configureer activationConstraint voor betere touch ervaring (250ms delay, 5px tolerance)
- Update RiderPassportSidebar met useDraggable voor touch-compatible rider cards
- Update TeamCard met useDroppable voor touch-compatible drop zones
- Verwijder oude HTML5 drag&drop handlers en mobile workarounds
- Voeg iOS-specific CSS fixes toe (webkit-touch-callout, tap-highlight)
- Drag & drop werkt nu volledig op iPad, iPhone en alle touch devices"

# Push
echo "⬆️  Pushing to GitHub..."
git push origin main

echo "✅ Deployment complete! Railway will auto-deploy from GitHub."
