// Compositional schemas, masses only, drawn inside a unit box (x right 0..1, y up 0..1).
// Each is the writer's reduction of the picture to its main masses, from the leaf's
// description where there is one and from general knowledge of the picture; nothing
// here is traced from an image and no detail is drawn.
const fig = (x, y, s = 1) => `\\fill[black!80] (${x},${y + 0.06 * s}) circle (${0.022 * s}); \\fill[black!80,rounded corners=1pt] (${x - 0.025 * s},${y - 0.12 * s}) rectangle (${x + 0.025 * s},${y + 0.04 * s});`;
export const SCHEMAS = {
  'nighthawks': `
\\fill[black!75] (0,0) rectangle (1,1);              % night street
\\fill[black!55] (0,0.55) rectangle (0.62,0.9);      % dark shopfront across the street
\\fill[white] (0.28,0.08) -- (0.28,0.62) -- (1,0.62) -- (1,0.08) -- (0.7,0.02) -- cycle; % the glass of the diner
\\fill[black!20] (0.3,0.14) -- (0.98,0.14) -- (0.98,0.22) -- (0.3,0.22) -- cycle; % counter
\\fill[black!45] (0.28,0.62) rectangle (1,0.72);     % the sign band
${fig(0.62, 0.32)} ${fig(0.7, 0.32)} ${fig(0.44, 0.34, 0.9)} ${fig(0.85, 0.30, 0.9)}
`,
  'automat': `
\\fill[black!85] (0,0.45) rectangle (1,1);            % the window, night
\\foreach \\x in {0.12,0.3,0.48,0.66,0.84} \\fill[white] (\\x,0.78) circle (0.014);
\\foreach \\x in {0.2,0.38,0.56,0.74,0.92} \\fill[white] (\\x,0.65) circle (0.011);
\\fill[black!15] (0.25,0.15) ellipse (0.28 and 0.09); % table
${fig(0.32, 0.38, 1.4)}
\\fill[black!30] (0.86,0.1) rectangle (0.98,0.42);   % radiator
`,
  'tables-for-ladies': `
\\fill[black!10] (0,0.35) rectangle (1,1);           % interior, cherry woodwork
\\fill[black!35] (0,0) rectangle (1,0.35);           % tiled floor
\\foreach \\x in {0.1,0.22,0.34,0.46,0.58} \\fill[black!55] (\\x,0.08) ellipse (0.06 and 0.05); % the display of fruit
\\fill[white] (0.62,0.22) -- (0.86,0.22) -- (0.9,0.62) -- (0.66,0.62) -- cycle; % waitress, all in white
\\fill[black!80] (0.78,0.7) circle (0.05);
${fig(0.2, 0.62, 1.2)} ${fig(0.12, 0.6, 1.1)}       % the couple at the table, rear left
\\fill[black!70] (0.42,0.62) rectangle (0.5,0.8);   % cashier in black at desk
`,
  'rooms-by-the-sea': `
\\fill[black!8] (0,0) rectangle (1,1);
\\fill[black!30] (0.42,0.02) rectangle (1,0.98);     % the open doorway
\\fill[black!55] (0.44,0.04) rectangle (0.98,0.5);   % sea
\\fill[white] (0.44,0.5) rectangle (0.98,0.96);      % sky
\\fill[white] (0.06,0.04) -- (0.42,0.04) -- (0.34,0.4) -- (0.06,0.4) -- cycle; % light on the floor
\\fill[black!20] (0,0.3) rectangle (0.18,0.95);      % the further room
`,
  'office-in-a-small-city': `
\\fill[black!12] (0,0.7) rectangle (1,1);            % sky
\\fill[black!40] (0,0.45) rectangle (0.32,0.7);      % rooftops beyond
\\fill[white] (0.3,0) rectangle (1,0.85);            % the white wall
\\fill[black!25] (0.4,0.2) rectangle (0.92,0.62);    % the corner window
${fig(0.62, 0.36, 1.3)}
\\fill[black!45] (0.66,0.24) rectangle (0.9,0.3);    % desk
`,
  'south-carolina-morning': `
\\fill[black!10] (0,0.55) rectangle (1,1);           % sky
\\fill[black!35] (0,0) rectangle (1,0.35);           % field
\\fill[white] (0,0.3) rectangle (0.62,0.9);          % the house front
\\fill[black!85] (0.3,0.3) rectangle (0.5,0.82);     % the doorway
\\fill[black!60] (0.4,0.7) circle (0.045); \\fill[black!60,rounded corners=1pt] (0.36,0.32) rectangle (0.44,0.66); % « Dinah »
`,
  'second-story-sunlight': `
\\fill[black!8] (0,0.6) rectangle (1,1);             % sky
\\fill[black!70] (0.62,0.2) rectangle (1,0.92);      % the woods behind
\\fill[black!30] (0,0) rectangle (1,0.22);           % grass
\\fill[white] (0.05,0.22) -- (0.05,0.72) -- (0.22,0.92) -- (0.39,0.72) -- (0.39,0.72) -- (0.56,0.92) -- (0.73,0.72) -- (0.73,0.22) -- cycle; % two gables
\\fill[black!25] (0.05,0.5) rectangle (0.73,0.53);   % the balcony rail
${fig(0.2, 0.6, 1.1)} ${fig(0.5, 0.62, 1.1)}       % « Gothic + Elderly », « Toots »
`,
  'a-woman-in-the-sun': `
\\fill[black!12] (0,0) rectangle (1,1);
\\fill[black!35] (0,0.05) rectangle (0.32,0.42);     % the bed
\\fill[black!20] (0.72,0.3) rectangle (0.96,0.85);   % the window, landscape out of it
\\fill[white] (0.36,0.06) -- (0.7,0.06) -- (0.62,0.5) -- (0.4,0.5) -- cycle; % « this Early light » on the floor
\\fill[black!80] (0.52,0.62) circle (0.035); \\fill[black!80,rounded corners=1pt] (0.49,0.14) rectangle (0.55,0.58); % the figure standing in it
`,
  'house-by-a-railroad': `
\\fill[black!8] (0,0.28) rectangle (1,1);            % sky
\\fill[black!75] (0,0) rectangle (1,0.14);           % the embankment and rail
\\fill[black!85] (0,0.14) rectangle (1,0.17);
\\fill[white] (0.3,0.17) rectangle (0.72,0.62);      % the house
\\fill[black!45] (0.3,0.62) -- (0.72,0.62) -- (0.68,0.8) -- (0.34,0.8) -- cycle; % mansard
\\fill[black!45] (0.46,0.8) rectangle (0.56,0.92);   % the tower
`,
  'night-shadows': `
\\fill[black!85] (0,0) rectangle (1,1);
\\fill[black!25] (0,0) -- (1,0.55) -- (1,0) -- cycle;      % the sidewalk, from above
\\fill[black!60] (0.55,0.3) rectangle (1,1);               % the corner building
\\fill[white] (0.72,0.45) rectangle (0.9,0.62);            % the lit shop window
\\fill[black!85] (0.3,0.12) -- (0.02,0.3) -- (0.04,0.34) -- (0.33,0.16) -- cycle; % the long shadow
\\fill[black!95] (0.32,0.14) circle (0.03);                % the man, from above
`,
  'evening-wind': `
\\fill[black!70] (0,0) rectangle (1,1);
\\fill[black!25] (0.02,0.05) rectangle (0.6,0.45);        % the bed
\\fill[black!10] (0.6,0.3) rectangle (0.98,0.95);         % the window
\\fill[white] (0.62,0.3) -- (0.62,0.9) -- (0.5,0.75) -- (0.45,0.4) -- cycle; % the curtain blowing in
\\fill[black!80] (0.33,0.62) circle (0.05); \\fill[black!80,rounded corners=2pt] (0.2,0.35) rectangle (0.45,0.58); % the figure kneeling on the bed
`,
  'east-side-interior': `
\\fill[black!60] (0,0) rectangle (1,1);
\\fill[white] (0.55,0.4) rectangle (0.95,0.95);           % the window
\\fill[black!35] (0.15,0.1) rectangle (0.5,0.4);          % the sewing machine and its table
\\fill[black!85] (0.3,0.6) circle (0.05); \\fill[black!85,rounded corners=2pt] (0.2,0.2) rectangle (0.4,0.55); % the woman turned to the window
`,
};
