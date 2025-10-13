// State name to abbreviation mapping
export const NAME_TO_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX',
  Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia':'DC', 'Washington, D.C.':'DC', 'Washington DC':'DC'
};

// Normalize function: converts "California" or "california" to "CA"
export const toAbbr = (stateNameOrAbbr: string | undefined | null): string | undefined => {
  if (!stateNameOrAbbr) return undefined;
  const s = stateNameOrAbbr.trim();
  if (s.length === 2) return s.toUpperCase(); // Already an abbreviation
  return NAME_TO_ABBR[s] || NAME_TO_ABBR[s.replace(/\s+/g, ' ')];
};

export const getRegionColor = (region: string): string => {
  const colors = {
    'West': '#3B82F6', // Blue
    'East': '#10B981', // Green
    'Central': '#F59E0B', // Yellow
    'South': '#EF4444' // Red
  };
  return colors[region as keyof typeof colors] || '#6B7280'; // Gray fallback
};

export const getProfitColor = (
  stateName: string, 
  stateProfitData: Map<string, number>
): string => {
  if (stateProfitData.size === 0) return '#6B7280';
  
  const stateAbbr = toAbbr(stateName);
  if (!stateAbbr) return '#6B7280';
  
  // Find the state in our data
  const stateProfit = Array.from(stateProfitData.entries()).find(([state]) => toAbbr(state) === stateAbbr);
  if (!stateProfit) return '#6B7280';
  
  const profit = stateProfit[1];
  const profits = Array.from(stateProfitData.values()).sort((a, b) => b - a);
  const totalStates = profits.length;
  
  // Use same percentile logic as legend
  const highThreshold = profits[Math.floor(totalStates * 0.33)]; // Top 33%
  const lowThreshold = profits[Math.floor(totalStates * 0.67)]; // Bottom 33%
  
  // Determine color based on percentile ranges
  if (profit >= highThreshold) {
    return 'rgb(0, 51, 255)'; // High profit - blue
  } else if (profit >= lowThreshold) {
    return 'rgb(127, 51, 127)'; // Medium profit - purple
  } else {
    return 'rgb(255, 51, 0)'; // Low profit - red
  }
};

export const calculateOptimalItemCount = (): number => {
  if (typeof window === 'undefined') return 6; // Default for SSR
  const availableHeight = window.innerHeight - 400; // Account for header, padding, etc.
  const itemHeight = 80; // Approximate height per store item
  const maxItems = Math.floor(availableHeight / itemHeight);
  return Math.max(4, Math.min(maxItems, 8)); // Between 4-8 items
};

