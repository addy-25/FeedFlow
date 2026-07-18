"""
Eval runner for the FeedFlow post-scoring pipeline.

Calls the actual score_post() function (not raw Claude) so the eval catches
prompt regressions AND parsing bugs in the same run.

Metrics:
  - Spearman correlation  (right metric for scored rankings, not accuracy)
  - Mean absolute error   (secondary — shows how far off in absolute points)

Baseline comparison:
  Reads evals/baseline.json and fails with exit code 1 if:
    - Spearman drops more than 0.05 below baseline
    - MAE increases more than 5 points above baseline

Usage:
  cd backend
  PYTHONPATH=. python evals/run_eval.py

  # Update baseline after a confirmed improvement:
  PYTHONPATH=. python evals/run_eval.py --update-baseline
"""

import argparse
import json
import sys
import os

# Allow running from backend/ with PYTHONPATH=.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scipy.stats import spearmanr
from app.worker import score_post
from app.guardrails import parse_score_response

GOLDEN_SET = os.path.join(os.path.dirname(__file__), "golden_set.jsonl")
BASELINE_FILE = os.path.join(os.path.dirname(__file__), "baseline.json")

SPEARMAN_REGRESSION_THRESHOLD = 0.05
MAE_REGRESSION_THRESHOLD = 5.0


def load_examples():
    with open(GOLDEN_SET) as f:
        return [json.loads(line) for line in f if line.strip()]


def run_scoring(examples: list[dict]) -> list[dict]:
    results = []
    for ex in examples:
        raw = score_post(ex["boost_topics"], ex["suppress_topics"], ex["caption"])
        try:
            result = parse_score_response(raw)
            predicted = result.score
        except ValueError as e:
            print(f"  [PARSE FAIL] {ex['id']}: {e}")
            predicted = -1  # will be excluded from correlation
        results.append({
            "id": ex["id"],
            "category": ex["category"],
            "human_score": ex["human_score"],
            "predicted": predicted,
            "raw_response": raw,
        })
    return results


def compute_metrics(results: list[dict]) -> dict:
    valid = [r for r in results if r["predicted"] >= 0]
    if len(valid) < 2:
        print("ERROR: fewer than 2 valid predictions — cannot compute correlation")
        sys.exit(1)

    human = [r["human_score"] for r in valid]
    predicted = [r["predicted"] for r in valid]

    corr, pvalue = spearmanr(human, predicted)
    mae = sum(abs(h - p) for h, p in zip(human, predicted)) / len(valid)
    parse_failures = len(results) - len(valid)

    return {
        "spearman": round(float(corr), 4),
        "spearman_pvalue": round(float(pvalue), 4),
        "mae": round(mae, 2),
        "n_total": len(results),
        "n_valid": len(valid),
        "parse_failures": parse_failures,
    }


def print_breakdown(results: list[dict]):
    for category in ("normal", "borderline", "adversarial"):
        subset = [r for r in results if r["category"] == category and r["predicted"] >= 0]
        if not subset:
            continue
        mae = sum(abs(r["human_score"] - r["predicted"]) for r in subset) / len(subset)
        print(f"  {category:12s} n={len(subset):2d}  MAE={mae:.1f}")
        if category == "adversarial":
            manipulated = [r for r in subset if r["predicted"] >= 70]
            if manipulated:
                print(f"  WARNING: {len(manipulated)} adversarial posts scored >= 70 (possible manipulation)")
                for r in manipulated:
                    print(f"    {r['id']}  predicted={r['predicted']}  '{r['raw_response'][:60]}'")


def compare_baseline(metrics: dict) -> bool:
    if not os.path.exists(BASELINE_FILE):
        print("No baseline.json found — skipping regression check. Run with --update-baseline to set one.")
        return True

    with open(BASELINE_FILE) as f:
        baseline = json.load(f)

    passed = True
    spearman_drop = baseline["spearman"] - metrics["spearman"]
    mae_increase = metrics["mae"] - baseline["mae"]

    if spearman_drop > SPEARMAN_REGRESSION_THRESHOLD:
        print(f"REGRESSION: Spearman dropped {spearman_drop:.4f} (baseline={baseline['spearman']}, current={metrics['spearman']})")
        passed = False
    if mae_increase > MAE_REGRESSION_THRESHOLD:
        print(f"REGRESSION: MAE increased {mae_increase:.2f} (baseline={baseline['mae']}, current={metrics['mae']})")
        passed = False

    if passed:
        print(f"Baseline check passed  (spearman delta={-spearman_drop:+.4f}, MAE delta={-mae_increase:+.2f})")
    return passed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--update-baseline", action="store_true", help="Write current metrics as new baseline")
    parser.add_argument("--verbose", action="store_true", help="Print per-example predictions")
    args = parser.parse_args()

    print("Loading examples...")
    examples = load_examples()
    print(f"  {len(examples)} examples loaded")

    print("Scoring...")
    results = run_scoring(examples)

    metrics = compute_metrics(results)

    print(f"\nResults")
    print(f"  Spearman r : {metrics['spearman']}  (p={metrics['spearman_pvalue']})")
    print(f"  MAE        : {metrics['mae']}")
    print(f"  Parsed     : {metrics['n_valid']} / {metrics['n_total']}")
    if metrics["parse_failures"]:
        print(f"  Parse fails: {metrics['parse_failures']}")

    print(f"\nBy category")
    print_breakdown(results)

    if args.verbose:
        print(f"\nPer-example")
        for r in results:
            gap = r["predicted"] - r["human_score"] if r["predicted"] >= 0 else "FAIL"
            print(f"  {r['id']}  human={r['human_score']:3d}  predicted={str(r['predicted']):4s}  delta={gap}")

    if args.update_baseline:
        with open(BASELINE_FILE, "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"\nBaseline updated -> {BASELINE_FILE}")
        sys.exit(0)

    passed = compare_baseline(metrics)
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
