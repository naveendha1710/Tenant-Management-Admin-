export const generateChartData = (tickets: any[]) => {
  // Status Distribution
  const statusData = tickets.reduce((acc: any, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  // Priority Distribution
  const priorityData = tickets.reduce((acc: any, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {});

  // Category Distribution
  const categoryData = tickets.reduce((acc: any, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});

  // Monthly Trend (last 6 months)
  const monthlyTrend: any = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTrend[key] = { created: 0, resolved: 0 };
  }

  tickets.forEach(t => {
    const created = new Date(t.created_at);
    const createdKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyTrend[createdKey]) {
      monthlyTrend[createdKey].created++;
    }
    
    if (t.resolved_at) {
      const resolved = new Date(t.resolved_at);
      const resolvedKey = `${resolved.getFullYear()}-${String(resolved.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrend[resolvedKey]) {
        monthlyTrend[resolvedKey].resolved++;
      }
    }
  });

  return { statusData, priorityData, categoryData, monthlyTrend };
};

export const createChartSVG = (data: any, type: 'bar' | 'pie', title: string, width = 600, height = 400) => {
  if (type === 'bar') {
    const entries = Object.entries(data);
    const maxValue = Math.max(...entries.map(([_, v]: any) => v));
    const barWidth = (width - 100) / entries.length;
    const chartHeight = height - 100;

    const bars = entries.map(([key, value]: any, i) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = 60 + i * barWidth;
      const y = height - 60 - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth - 10}" height="${barHeight}" fill="#3b82f6" />
        <text x="${x + barWidth / 2 - 10}" y="${height - 40}" font-size="10" fill="#666">${key.slice(0, 8)}</text>
        <text x="${x + barWidth / 2 - 10}" y="${y - 5}" font-size="12" fill="#333">${value}</text>
      `;
    }).join('');

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="${width / 2}" y="30" font-size="16" font-weight="bold" text-anchor="middle">${title}</text>
        <line x1="50" y1="${height - 50}" x2="${width - 50}" y2="${height - 50}" stroke="#ccc" stroke-width="2"/>
        <line x1="50" y1="50" x2="50" y2="${height - 50}" stroke="#ccc" stroke-width="2"/>
        ${bars}
      </svg>
    `;
  } else {
    // Pie chart
    const entries = Object.entries(data);
    const total = entries.reduce((sum, [_, v]: any) => sum + v, 0);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    let currentAngle = 0;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    
    const slices = entries.map(([key, value]: any, i) => {
      const angle = (value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      return `
        <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" 
              fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="2"/>
        <text x="${width - 150}" y="${50 + i * 20}" font-size="12" fill="#333">
          <tspan fill="${colors[i % colors.length]}" font-size="16">■</tspan> ${key}: ${value}
        </text>
      `;
    }).join('');

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="${width / 2}" y="30" font-size="16" font-weight="bold" text-anchor="middle">${title}</text>
        ${slices}
      </svg>
    `;
  }
};
