/* Canned answers for the FAQ chips: reviewed wording, replayed instantly at
   zero API cost. Each entry matches a chip's exact text and carries steps per
   voice; a step is either { call, input } — one of the chat's own tools, so
   every chart and lever move is computed live from TI_DATA — or { say }, the
   reply text. The prose is the only thing stored here, so its figures must
   stay in sync with the data: run `node tests/verify-answers.js` after any
   edit. Unhinged mode is deliberately absent — those clicks go to the live
   AI, where the improv is the point. */
window.TI_ANSWERS = [
  {
    q: "How did we do under Trump vs. Biden?",
    modes: {
      scholar: [
        { call: "show_history", input: { indicator: "overall", from: 2015, to: 2020, marks: [2016, 2020], marksLabel: "presidential elections" } },
        { say: "The measured data runs through 2020, so it covers Trump's first term but none of Biden's — that gap is the honest headline. Within the data, the overall index fell from 78 in 2016 to 72 in 2020, led by freedom of movement (down 19), effective parliament (down 16) and freedom of expression (down 15); for 2021–2025 the 2026 report finds seven indicators declined significantly, so the slide continued past the handover." }
      ],
      witty: [
        { call: "show_history", input: { indicator: "overall", from: 2015, to: 2020, marks: [2016, 2020], marksLabel: "presidential elections" } },
        { say: "Full disclosure: the scorekeeper went home in 2020, so Trump's first term is on the books and Biden's entire presidency is a shrug. What the books show is 78 in 2016 down to 72 in 2020, with freedom of movement off 19 points, effective parliament off 16 and freedom of expression off 15. And the 2026 report says seven indicators kept falling through 2025 — less a partisan cliffhanger, more a series that never got a season finale." }
      ]
    }
  },
  {
    q: "Which indicators fell furthest since 2020? Show me.",
    modes: {
      scholar: [
        { call: "show_changes", input: { from: 2020, to: "today", top: 6 } },
        { say: "Every point of decline since 2020 sits in six measured indicators: free political parties down 6, freedom of expression, freedom of the press, access to justice and judicial independence down 4 each, and effective parliament 2 below its previous 45-year floor. The report's seventh decliner, economic equality, only joined the framework in 2023 so it has no bar here — and these post-2020 figures translate the report's findings onto the measured scale; they are not new measurements." }
      ],
      witty: [
        { call: "show_changes", input: { from: 2020, to: "today", top: 6 } },
        { say: "Six indicators did all the falling since 2020: free political parties down 6, then expression, the press, access to justice and judicial independence down 4 apiece, with effective parliament limbo-ing 2 under its old 45-year floor. The seventh casualty in the report, economic equality, joined the framework in 2023 and left its historical paperwork at home. Fine print: these post-2020 bars translate the report's findings onto the measured scale — nobody has measured anything since 2020, which is itself a finding." }
      ]
    }
  },
  {
    q: "What was our strongest era since 1975?",
    modes: {
      scholar: [
        { call: "show_history", input: { indicator: "overall", marks: [2009, 2013], marksLabel: "all-time peak (79)" } },
        { say: "By the measured overall index, the strongest stretch was 2005–2014: it averaged 77.7 and holds the all-time peak of 79, reached in 2009 and again in 2012–13, while no other decade averaged above 76.1. The sobering symmetry: the index started at 72 in 1975 and, after that peak, was back at exactly 72 by 2020." }
      ],
      witty: [
        { call: "show_history", input: { indicator: "overall", marks: [2009, 2013], marksLabel: "all-time peak (79)" } },
        { say: "The golden age was 2005–2014 — a 77.7 average and the all-time high of 79 in 2009 and 2012–13, back when 'unprecedented' was still a compliment. No other decade beat 76.1. And the punchline: 72 in 1975, 72 in 2020 — a 45-year round trip and we didn't even earn the mileage points." }
      ]
    }
  },
  {
    q: "What would a realistic recovery look like? Show me.",
    modes: {
      scholar: [
        { call: "set_levers", input: { electoral: 90, press: 84, courts: 86, restraint: 85, integrity: 82, civic: 72 } },
        { call: "show_history", input: { indicator: "overall", marks: [1990], marksLabel: "where the recovery scenario lands (76)" } },
        { say: "The page behind this chat now shows the Recovery scenario: all six levers raised fifteen points toward their historical bests, lifting the overall index from 67 to 76. That is not utopia — 76 is where the measured index actually stood around 1990, marked on the chart — so a realistic recovery means winning back ground the country held within living memory." }
      ],
      witty: [
        { call: "set_levers", input: { electoral: 90, press: 84, courts: 86, restraint: 85, integrity: 82, civic: 72 } },
        { call: "show_history", input: { indicator: "overall", marks: [1990], marksLabel: "where the recovery scenario lands (76)" } },
        { say: "I just pulled all six levers up fifteen points behind you — look at the page, the index went from 67 to 76. Before anyone calls that fantasy: 76 is simply 1990, marked on the chart, a year most of this room remembers without flattering lighting. Recovery isn't inventing a new country; it's driving back to one you've already lived in." }
      ]
    }
  },
  {
    q: "Which of these numbers are actually measured?",
    modes: {
      scholar: [
        { say: "Twenty-two of the thirty are measured: their 1975–2020 lines and the dotted 2020 marks come straight from International IDEA's GSoD Indices v5.1 dataset. The other eight — political equality, economic equality, executive compliance with the constitution, oversight of security forces, equal treatment before the law, everyday civic engagement, shared factual public sphere and cross-party cooperation — joined the framework in 2023 with no historical series. Every 2026 bar height is a calibrated estimate anchored to the 2020 measurements and the report's findings, not a fresh measurement." }
      ],
      witty: [
        { say: "Twenty-two of the thirty come with receipts: their 1975–2020 lines and dotted 2020 marks are straight from the GSoD v5.1 dataset. The other eight only joined the framework in 2023, so they're the new hires — credentialed, but no performance history. As for every 2026 bar: it's a calibrated estimate built on the 2020 measurements and the report's findings, because nobody has published a measurement since 2020 — honesty about that is the house style here." }
      ]
    }
  },
  {
    q: "Why is effective parliament so low?",
    modes: {
      scholar: [
        { call: "show_history", input: { indicator: "effective parliament", marks: [2016], marksLabel: "2016 election" } },
        { say: "Effective parliament — Congress operating as a real check on the executive — scored 78 for most of five decades, then dropped 16 points to 62 between 2016 and 2020, one of the two steepest falls of any indicator in that window. The 2026 report finds it has since sunk to a new 50-year low, which is why the bar sits at 60 today." }
      ],
      witty: [
        { call: "show_history", input: { indicator: "effective parliament", marks: [2016], marksLabel: "2016 election" } },
        { say: "Congress held a rock-steady 78 for most of five decades — then shed 16 points between 2016 and 2020, landing at 62, one of the two steepest falls on the whole board. The 2026 report says it has since hit a new 50-year low, hence today's 60. The branch designed to check the executive is the one that stopped showing up for its shift — the checks bounced." }
      ]
    }
  }
];
