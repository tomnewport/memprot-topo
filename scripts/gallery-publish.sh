#!/usr/bin/env bash
# Publish screenshots to <dest>/ on the gallery-images branch.
#
# Runs for different branches publish at the same time, each to its own
# folder, so a push can be rejected because another run pushed first. The
# folders don't overlap, so rebase onto the new tip and push again.
#
# Usage: gallery-publish.sh <source-dir> <dest-dir>
# Env: GITHUB_TOKEN, REPO (owner/name), COMMIT_SHA
set -euo pipefail

src=$(cd "$1" && pwd)
dest=$2
branch=gallery-images
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

git clone --quiet --depth 1 --branch "$branch" \
  "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$work"
cd "$work"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

# Files not produced this run are kept (a failed fetch must not wipe them).
mkdir -p "./$dest"
cp -R "$src"/. "./$dest/"
git add -A "./$dest"
if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi
git commit --quiet -m "gallery: update $dest [skip ci] ${COMMIT_SHA:-}"

for attempt in 1 2 3 4 5 6; do
  if git push --quiet origin "HEAD:$branch"; then
    echo "Published to $branch/$dest."
    exit 0
  fi
  echo "Push rejected (attempt $attempt); rebasing onto the new tip."
  sleep $((attempt * 2 + RANDOM % 5))
  git fetch --quiet --depth 1 origin "$branch"
  git rebase --quiet --onto FETCH_HEAD HEAD~1
done
echo "Could not publish after 6 attempts." >&2
exit 1
