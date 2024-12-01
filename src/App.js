import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  
  const COLORS = {
    'GPT-4': '#e41a1c',
    'Gemini': '#377eb8',
    'PaLM-2': '#4daf4a',
    'Claude': '#984ea3',
    'LLaMA-3.1': '#ff7f00'
  };
  
  const models = ['LLaMA-3.1', 'Claude', 'PaLM-2', 'Gemini', 'GPT-4'];
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      const parsedData = d3.csvParse(text, d => ({
        date: d3.timeParse("%m/%d/%y")(d.Date),
        'GPT-4': +d['GPT-4'],
        'Gemini': +d['Gemini'],
        'PaLM-2': +d['PaLM-2'],
        'Claude': +d['Claude'],
        'LLaMA-3.1': +d['LLaMA-3.1']
      }));
      console.log('Parsed Data:', parsedData);
      setData(parsedData);
    };
    
    reader.readAsText(file);
  };
  
  useEffect(() => {
    if (!data) return;
    
    d3.select(svgRef.current).selectAll('*').remove();
    
    const margin = { top: 20, right: 160, bottom: 30, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const stack = d3.stack()
      .keys(models)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetWiggle);
    
    const series = stack(data);
    
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([
        d3.min(series, layer => d3.min(layer, d => d[0])),
        d3.max(series, layer => d3.max(layer, d => d[1]))
      ])
      .range([height, 0]);
    
    const area = d3.area()
      .x(d => x(d.data.date))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis);
    
    svg.selectAll('path')
      .data(series)
      .enter()
      .append('path')
      .attr('d', area)
      .style('fill', (d) => COLORS[d.key])
      .on('mouseover', (event, d) => {
        const model = d.key;
        showTooltip(event, model, d);
      })
      .on('mousemove', (event, d) => {
        const model = d.key;
        showTooltip(event, model, d);
      })
      .on('mouseout', () => {
        d3.select(tooltipRef.current)
          .style('opacity', 0);
      });
    
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));
    
    const legend = svg.append('g')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(models)
      .enter()
      .append('g')
      .attr('transform', (d, i) => `translate(${width + 10},${i * 20})`);
    
    legend.append('rect')
      .attr('x', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => COLORS[d]);
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 7.5)
      .attr('dy', '0.32em')
      .text(d => d);
      
  }, [data]);
  
  const showTooltip = (event, model, layerData) => {
    const tooltip = d3.select(tooltipRef.current);
    const mouseX = event.pageX;
    const mouseY = event.pageY;
    
    tooltip.selectAll('*').remove();
    
    const margin = { top: 10, right: 10, bottom: 20, left: 30 };
    const width = 150 - margin.left - margin.right;
    const height = 100 - margin.top - margin.bottom;
    
    const tooltipSvg = tooltip
      .style('opacity', 1)
      .style('left', `${mouseX + 10}px`)
      .style('top', `${mouseY - 120}px`)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const modelData = data.map(d => ({
      date: d.date,
      value: d[model]
    }));
    
    const x = d3.scaleBand()
      .range([0, width])
      .domain(modelData.map(d => d.date))
      .padding(0.1);
    
    const y = d3.scaleLinear()
      .range([height, 0])
      .domain([0, d3.max(modelData, d => d.value)]);
    
    tooltipSvg.selectAll('rect')
      .data(modelData)
      .enter()
      .append('rect')
      .attr('x', d => x(d.date))
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', COLORS[model]);
    
    tooltipSvg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickFormat(d => d3.timeFormat('%b')(d)))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-65)');
    
    tooltipSvg.append('g')
      .call(d3.axisLeft(y).ticks(5));
  };

  return (
    <div className="App">
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
          />
        </div>
        <div className="relative">
          <svg ref={svgRef}></svg>
          <div
            ref={tooltipRef}
            className="absolute bg-white p-2 rounded shadow-lg opacity-0 pointer-events-none"
            style={{ zIndex: 1000 }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default App;