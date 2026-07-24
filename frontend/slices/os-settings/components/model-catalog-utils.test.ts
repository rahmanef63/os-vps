import { describe, expect, it } from "vitest";
import { filterAndSortModels, type CatModel } from "./model-catalog-utils";

const models: CatModel[] = [
  { ref: "a", id: "cheap-tools", context: 128000, inputCost: 0.1, outputCost: 0.2, tools: true },
  { ref: "b", id: "expensive-vision", context: 1000000, inputCost: 10, outputCost: 30, vision: true },
  { ref: "c", id: "reasoner", context: 64000, inputCost: 1, outputCost: 1, reasoning: true },
];

describe("model catalog filters", () => {
  it("filters by capabilities and context", () => {
    const got = filterAndSortModels(models, "", { tools: true, reasoning: false, vision: false, minContext: 128000 }, "best");
    expect(got.map((m) => m.id)).toEqual(["cheap-tools"]);
  });

  it("sorts by price and best value", () => {
    const filters = { tools: false, reasoning: false, vision: false, minContext: 0 };
    expect(filterAndSortModels(models, "", filters, "price")[0].id).toBe("cheap-tools");
    expect(filterAndSortModels(models, "", filters, "best")[0].id).toBe("cheap-tools");
  });
});
