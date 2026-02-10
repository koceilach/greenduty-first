export type HealthResult = {
  status: "Healthy" | "Water stress" | "Overwatering" | "Nutrient deficiency" | "Pest damage" | "Disease indicators"
  issues: string[]
  actions: string[]
}

export const analyzeHealthStub = (fileName: string): HealthResult => {
  const name = fileName.toLowerCase()
  if (name.includes("dry") || name.includes("wilt")) {
    return {
      status: "Water stress",
      issues: ["Wilting leaves", "Dry soil surface"],
      actions: ["Deep water early morning", "Add mulch to retain moisture"],
    }
  }
  if (name.includes("yellow") || name.includes("pale")) {
    return {
      status: "Nutrient deficiency",
      issues: ["Yellowing leaves", "Slow growth"],
      actions: ["Apply balanced fertilizer", "Check soil pH"],
    }
  }
  if (name.includes("spot") || name.includes("fungus")) {
    return {
      status: "Disease indicators",
      issues: ["Leaf spots", "Discoloration"],
      actions: ["Remove infected leaves", "Improve airflow"],
    }
  }
  if (name.includes("bug") || name.includes("pest")) {
    return {
      status: "Pest damage",
      issues: ["Chewed edges", "Visible insects"],
      actions: ["Inspect underside of leaves", "Use mild insecticidal soap"],
    }
  }
  if (name.includes("soggy") || name.includes("over")) {
    return {
      status: "Overwatering",
      issues: ["Soft stems", "Mushy soil"],
      actions: ["Reduce watering frequency", "Improve drainage"],
    }
  }
  return {
    status: "Healthy",
    issues: ["No visible stress signals detected"],
    actions: ["Maintain current care schedule", "Monitor weekly"],
  }
}
