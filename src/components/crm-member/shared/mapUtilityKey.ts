export function mapUtilityKey(key: string): string {
  switch (key.toLowerCase()) {
    case "c&i electricity":
      return "electricity_ci";
    case "sme electricity":
      return "electricity_sme";
    case "c&i gas":
      return "gas_ci";
    case "sme gas":
    case "small gas":
      return "gas_sme";
    case "waste":
      return "waste";
    case "oil":
      return "oil";
    case "cleaning":
      return "cleaning";
    case "robot":
      return "robot_data";
    default:
      throw new Error(`Unknown utility key: ${key}`);
  }
}

