cd packages/core && pnpm publish --access public --tag $1 --no-git-checks
cd ../../

cd packages/field-contentful && pnpm publish --access public --tag $1 --no-git-checks
cd ../../

cd packages/plugin-emotion-cache && pnpm publish --access public --tag $1 --no-git-checks
cd ../../

cd packages/plugin-heading-analyzer && pnpm publish --access public --tag $1 --no-git-checks
cd ../../

cd packages/create-puck-app && pnpm run removeGitignore && pnpm publish --access public --tag $1 --no-git-checks && pnpm run restoreGitignore
cd ../../
