#!/usr/bin/env python3
"""Check Member 2 in a temporary workspace, leaving the application repo untouched."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--toolchain-dir", type=Path,
    help="Directory containing node_modules with React, React DOM and their typings; defaults to the repo.",
)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
toolchain = (args.toolchain_dir or repo).resolve()
dependencies = toolchain / "node_modules"
for name in ("react", "react-dom", "@types/react", "@types/react-dom"):
    if not (dependencies / name / "package.json").is_file():
        parser.error(f"Missing {name} in {dependencies}. See docs/conversation/README.md for isolated setup.")
compiler = dependencies / ".bin/tsc"
compiler_command = str(compiler) if compiler.exists() else shutil.which("tsc")
if not compiler_command:
    parser.error("TypeScript is required, either in this toolchain or on PATH.")

with tempfile.TemporaryDirectory(prefix="openloop-conversation-check-") as temporary:
    workspace = Path(temporary)
    for relative in ("src/components/import", "src/lib/conversation"):
        shutil.copytree(repo / relative, workspace / relative)
    shared = workspace / "src/types/openloop.ts"
    shared.parent.mkdir(parents=True, exist_ok=True)
    canonical_contract = repo / "src/types/openloop.ts"
    if canonical_contract.is_file():
        shutil.copytree(repo / "src/types", workspace / "src/types", dirs_exist_ok=True)
        print("Using canonical src/types/openloop.ts.", flush=True)
    else:
        specification = repo / "PROJECT_BRIEF.md"
        if not specification.is_file():
            specification = repo / "README.md"
        block = re.search(r"```ts\n(export type (?:Source|Confidence)[\s\S]*?)\n```", specification.read_text())
        if not block:
            raise SystemExit("Cannot locate the documented shared contract; refusing to invent types.")
        shared.write_text(block.group(1) + "\n")
        print(f"Canonical shared file absent: using a temporary verbatim {specification.name} contract outside the repo.", flush=True)

    (workspace / "node_modules").symlink_to(dependencies, target_is_directory=True)
    (workspace / "package.json").write_text('{"private":true,"type":"commonjs"}\n')
    config = {
        "compilerOptions": {
            "target": "ES2022", "module": "Node16", "moduleResolution": "Node16",
            "jsx": "react-jsx", "strict": True, "esModuleInterop": True,
            "skipLibCheck": True, "forceConsistentCasingInFileNames": True,
            "lib": ["ES2022", "DOM"], "rootDir": ".", "outDir": "build",
            "types": ["react", "react-dom"],
        },
        "include": ["src/**/*.ts", "src/**/*.tsx"],
    }
    (workspace / "tsconfig.json").write_text(json.dumps(config, indent=2) + "\n")
    print("Strict TypeScript module compilation:", flush=True)
    subprocess.run([compiler_command, "--project", str(workspace / "tsconfig.json")], check=True)
    environment = dict(os.environ, CONVERSATION_BUILD_DIR=str(workspace / "build"))
    subprocess.run(["node", "--test", "tests/conversation/conversation.test.cjs"], cwd=repo, env=environment, check=True)
    print("Verified the isolated module only, not a Next.js build, browser workflow or real OCR integration.", flush=True)
