document.addEventListener('DOMContentLoaded', function () {
  d3.csv('data.csv')
    .then((data) => {
      // Parse data
      data.forEach((d) => {
        d.year = +d.year;
        d.so2 = +d.so2;
        d.no2 = +d.no2;
        d.rspm = +d.rspm;
        d.spm = +d.spm;
        d.pm2_5 = +d.pm2_5 || null; // Handle undefined values for pm2_5
      });
      const stateAverages = d3
        .rollups(
          data,
          (v) => ({
            so2: d3.mean(v, (d) => d.so2),
            no2: d3.mean(v, (d) => d.no2),
            rspm: d3.mean(v, (d) => d.rspm),
            spm: d3.mean(v, (d) => d.spm),
          }),
          (d) => d.state,
        )
        .map(([state, values]) => ({ state, ...values }));

      // Create bar charts for each pollutant
      const pollutants = ['so2', 'no2', 'rspm', 'spm'];
      pollutants.forEach((pollutant) =>
        renderBarChart(stateAverages, pollutant),
      );

      const states = Array.from(
        new Set(data.map((d) => d.state)),
      );
      const stateSelector = d3.select('#stateSelector');
      stateSelector
        .selectAll('option')
        .data(states)
        .enter()
        .append('option')
        .text((d) => d)
        .attr('value', (d) => d);

      // Event listener for state selection
      stateSelector.on('change', function (event) {
        const selectedState = event.target.value;
        updateChart(
          data.filter((d) => d.state === selectedState),
        );
      });

      // Initial chart rendering for the first state
      updateChart(
        data.filter((d) => d.state === states[0]),
      );

      function updateChart(filteredData) {
        const svgWidth = 600,
          svgHeight = 400;
        const margin = {
          top: 20,
          right: 80,
          bottom: 30,
          left: 50,
        };
        const width = svgWidth - margin.left - margin.right;
        const height =
          svgHeight - margin.top - margin.bottom;

        d3.select('#charts').selectAll('*').remove(); // Clear previous SVG

        const svg = d3
          .select('#charts')
          .append('svg')
          .attr('width', svgWidth)
          .attr('height', svgHeight)
          .append('g')
          .attr(
            'transform',
            `translate(${margin.left},${margin.top})`,
          );

        const x = d3
          .scaleLinear()
          .domain(d3.extent(filteredData, (d) => d.year))
          .range([0, width]);

        const y = d3
          .scaleLinear()
          .domain([
            0,
            d3.max(filteredData, (d) =>
              Math.max(
                d.so2,
                d.no2,
                d.rspm,
                d.spm,
                d.pm2_5,
              ),
            ),
          ])
          .range([height, 0]);

        svg
          .append('g')
          .attr('transform', `translate(0,${height})`)
          .call(
            d3.axisBottom(x).tickFormat(d3.format('d')),
          );

        svg.append('g').call(d3.axisLeft(y));

        const pollutants = [
          'so2',
          'no2',
          'rspm',
          'spm',
          'pm2_5',
        ];
        const color = d3
          .scaleOrdinal(d3.schemeCategory10)
          .domain(pollutants);

        pollutants.forEach((pollutant) => {
          const line = d3
            .line()
            .defined((d) => !isNaN(d[pollutant]))
            .x((d) => x(d.year))
            .y((d) => y(d[pollutant]));

          svg
            .append('path')
            .datum(filteredData)
            .attr('fill', 'none')
            .attr('stroke', color(pollutant))
            .attr('stroke-width', 1.5)
            .attr('d', line);
        });
      }
      function renderBarChart(data, pollutant) {
        const svgWidth = 960,
          svgHeight = 500; // Adjusted for better fit
        const margin = {
          top: 20,
          right: 20,
          bottom: 140,
          left: 50,
        }; // Increased bottom margin for rotated labels
        const width = svgWidth - margin.left - margin.right;
        const height =
          svgHeight - margin.top - margin.bottom - 60; // Extra space for legend

        const svg = d3
          .select('#stateComparisonCharts')
          .append('svg')
          .attr('width', svgWidth)
          .attr('height', svgHeight)
          .append('g')
          .attr(
            'transform',
            `translate(${margin.left},${margin.top})`,
          );

        const x = d3
          .scaleBand()
          .range([0, width])
          .domain(data.map((d) => d.state))
          .padding(0.1);

        const y = d3
          .scaleLinear()
          .range([height, 0])
          .domain([0, d3.max(data, (d) => d[pollutant])]);

        const color = d3
          .scaleOrdinal(d3.schemeCategory10) // Using a 10-color scheme
          .domain(data.map((d) => d.state));

        const xAxis = svg
          .append('g')
          .attr('transform', `translate(0,${height})`)
          .call(d3.axisBottom(x).tickSizeOuter(0));

        // Rotate the state names to be vertical
        xAxis
          .selectAll('text')
          .style('text-anchor', 'end')
          .attr('dx', '-.8em')
          .attr('dy', '.15em')
          .attr('transform', 'rotate(-90)');

        svg.append('g').call(d3.axisLeft(y));

        // Append bars
        const bars = svg
          .selectAll('.bar')
          .data(data)
          .enter()
          .append('rect')
          .attr('class', 'bar')
          .attr('x', (d) => x(d.state))
          .attr('y', (d) => y(d[pollutant]))
          .attr('width', x.bandwidth())
          .attr('height', (d) => height - y(d[pollutant]))
          .attr('fill', (d) => color(d.state));

        // text labels
        svg
          .selectAll('.bar-label')
          .data(data)
          .enter()
          .append('text')
          .attr('class', 'bar-label')
          .attr('x', (d) => x(d.state) + x.bandwidth() / 2)
          .attr('y', (d) => y(d[pollutant]) - 5) // Adjust position for better alignment
          .attr('text-anchor', 'middle')
          .style('font-size', '12px') // Set font size here
          .text((d) => d[pollutant].toFixed(2));
        //chart title
        svg
          .append('text')
          .attr('x', width / 2)
          .attr('y', +5) // Adjusted position to not get cut off
          .attr('text-anchor', 'middle')
          .style('font-size', '16px')
          .style('text-decoration', 'underline')
          .text(
            `Average ${pollutant.toUpperCase()} by State`,
          );
      }
    })
    .catch((error) => {
      console.error('Error loading the CSV file:', error);
    });
});
