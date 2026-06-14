/**
 * Run createTeamPerformanceSurvey() once from the Apps Script editor.
 * It will:
 *   1. Create an anonymous Google Form with all 63 questions (7-point scale)
 *   2. Create a linked Google Sheet
 *   3. Add a "Section Summary" tab with per-section scores (−3 to +3)
 *
 * After running, check the Logs (View → Logs) for the shareable Form URL.
 */

function createTeamPerformanceSurvey() {

  // ── Survey content ──────────────────────────────────────────────────────
  var survey = [
    {
      section: '1. Orientation',
      subsections: [
        {
          name: 'Purpose',
          questions: [
            { q: "How clear is our team's purpose (Why we do what we do)?",
              high: 'Well Defined (+3)', low: 'Unclear (−3)' },
            { q: "How important is the team's work in my view?",
              high: 'Essential (+3)', low: 'Dispensable (−3)' },
            { q: "What value does the organisation place on our team's work?",
              high: 'An organisational priority (+3)', low: 'Low down in the priorities (−3)' }
          ]
        },
        {
          name: 'Team Identity',
          questions: [
            { q: 'How strong is our team identity?',
              high: 'Strong (+3)', low: 'Faint (−3)' },
            { q: 'How compelling is our team identity — how much does it motivate me?',
              high: 'Appealing (+3)', low: 'Unexciting (−3)' },
            { q: 'How distinctive is our team identity — are we unique amongst the other teams?',
              high: 'Distinctive (+3)', low: 'Similar to others (−3)' }
          ]
        },
        {
          name: 'Membership',
          questions: [
            { q: 'How comfortable a fit is this team for me and my personality?',
              high: 'Right at home (+3)', low: 'Out of place (−3)' },
            { q: 'How desirable is it to be a member of this team?',
              high: 'Enviable (+3)', low: 'Unfortunate (−3)' },
            { q: 'How fully included do you feel in this team?',
              high: 'Accepted (+3)', low: 'Left Out (−3)' }
          ]
        }
      ]
    },
    {
      section: '2. Trust Building',
      subsections: [
        {
          name: 'Mutual Regard',
          questions: [
            { q: 'How authentic are team members in the group?',
              high: 'Genuine (+3)', low: 'Phony (−3)' },
            { q: 'How well-meaning are team members?',
              high: 'Well meaning (+3)', low: 'Devious (−3)' },
            { q: "How do members balance the team's interests against their own?",
              high: 'Team orientated (+3)', low: 'People focus on their own interests/tasks (−3)' }
          ]
        },
        {
          name: 'Forthrightness',
          questions: [
            { q: 'What is our dominant strategy to deal with tough issues?',
              high: 'Put things on the table (+3)', low: 'Avoid the tough conversations (−3)' },
            { q: 'How readily do we come to grips with tough issues?',
              high: 'Freely (+3)', low: 'Reluctantly (−3)' },
            { q: 'How directly do we address tough issues?',
              high: 'Straight forwardly (+3)', low: 'In a round-about way (−3)' }
          ]
        },
        {
          name: 'Reliability',
          questions: [
            { q: 'How skilled are we in our team work performance?',
              high: 'Skillful (+3)', low: 'Inept (−3)' },
            { q: 'How consistently do we do what we say we will?',
              high: 'We are reliable (+3)', low: 'We are often undependable (−3)' },
            { q: 'How timely are we in delivering on commitments?',
              high: 'Consistently on time (+3)', low: 'Often too late (−3)' }
          ]
        }
      ]
    },
    {
      section: '3. Goal Clarification',
      subsections: [
        {
          name: 'Explicit Assumptions',
          questions: [
            { q: 'In every team, individuals hold sets of working assumptions. How well tested are our working assumptions — do we talk about them and challenge them?',
              high: 'Explicit (+3)', low: 'Unexamined (−3)' },
            { q: "How realistic are our assumptions? For example, do we over- or underestimate our team's efficiency, pace, processes or ability?",
              high: 'Well founded (+3)', low: 'Questionable (−3)' },
            { q: 'To what extent are we all working with the same assumptions in the team?',
              high: 'Same for everyone (+3)', low: 'Different from person to person (−3)' }
          ]
        },
        {
          name: 'Clear, Integrated Goals',
          questions: [
            { q: 'How clear are our team goals?',
              high: 'Specific (+3)', low: 'Vague (−3)' },
            { q: 'How doable or achievable are our goals?',
              high: 'Realistically challenging (+3)', low: 'Out of reach (−3)' },
            { q: 'Do we know how to measure our performance against the goals?',
              high: 'Supported by performance measures (+3)', low: 'Lacking standards and checks (−3)' }
          ]
        },
        {
          name: 'Shared Vision',
          questions: [
            { q: 'How clear is our team vision, if we have one? (What we hope to achieve / where we aim to be in the next 2–3 years)',
              high: 'Sharply drawn (+3)', low: 'Murky (−3)' },
            { q: 'How exciting is the vision we have?',
              high: 'Compelling (+3)', low: 'Uninspiring (−3)' },
            { q: 'How do we use our vision as a reference point?',
              high: 'Influences day to day (+3)', low: 'Has little impact on what we do (−3)' }
          ]
        }
      ]
    },
    {
      section: '4. Commitment',
      subsections: [
        {
          name: 'Assigned Roles',
          questions: [
            { q: 'How clear are the roles of team members?',
              high: 'Clear and well defined (+3)', low: 'Ambiguous / not clear (−3)' },
            { q: 'Is the way roles are formed a help or a hindrance to our daily work?',
              high: 'Contributes to performance (+3)', low: 'Detracts from performance (−3)' },
            { q: 'How well do our role definitions cover the work we have to do, or has the work evolved and left gaps?',
              high: 'Comprehensive (+3)', low: 'Incomplete (−3)' }
          ]
        },
        {
          name: 'Allocated Resources',
          questions: [
            { q: 'How well do we make use of our team resources? (Equipment, people etc.)',
              high: 'Well used (+3)', low: 'Somewhat wasted (−3)' },
            { q: 'How fairly are resources shared among team members?',
              high: 'Even handedly allocated (+3)', low: 'Shared inequitably (−3)' },
            { q: 'Do we have enough resources for the work we do?',
              high: 'Sufficient for our work (+3)', low: 'Too little for our task (−3)' }
          ]
        },
        {
          name: 'Decisions Made',
          questions: [
            { q: 'How good is our decision-making process?',
              high: 'Effective (+3)', low: 'Mistake prone (−3)' },
            { q: 'Are we quick with our decision making?',
              high: 'Well-paced (+3)', low: 'Overly drawn out (−3)' },
            { q: 'How much does our decision-making process involve all team members?',
              high: 'Engaging (+3)', low: 'Not included (−3)' }
          ]
        }
      ]
    },
    {
      section: '5. Implementation',
      subsections: [
        {
          name: 'Clear Processes',
          questions: [
            { q: 'How firmly defined are our work processes? (The formal processes that define how our work should be completed)',
              high: 'Well Established (+3)', low: 'Not defined (−3)' },
            { q: 'How efficient are our work processes?',
              high: 'Efficient (+3)', low: 'Wasteful (−3)' },
            { q: 'How faithfully do we follow established procedures?',
              high: 'Consistently followed (+3)', low: 'Disregarded / workarounds found (−3)' }
          ]
        },
        {
          name: 'Alignment',
          questions: [
            { q: 'How co-ordinated are we as a team — do we work together well or as individual parts?',
              high: 'Well co-ordinated (+3)', low: 'Out of sync (−3)' },
            { q: 'How are our interactions with each other?',
              high: 'Fluid and easy, done without thinking (+3)', low: 'Awkward (−3)' },
            { q: "How closely do our daily individual actions and tasks fit together with the rest of the team's daily individual tasks?",
              high: 'Harmonious (+3)', low: 'Clashing (−3)' }
          ]
        },
        {
          name: 'Disciplined Execution',
          questions: [
            { q: 'How disciplined are we in our work operations?',
              high: 'Disciplined (+3)', low: 'Sloppy (−3)' },
            { q: 'How well do we meet time targets?',
              high: 'On time (+3)', low: 'Off schedule (−3)' },
            { q: 'How determined are we in getting work done?',
              high: 'Persistent (+3)', low: 'Half hearted (−3)' }
          ]
        }
      ]
    },
    {
      section: '6. High Performance',
      subsections: [
        {
          name: 'Spontaneous Interaction',
          questions: [
            { q: 'When we interact as a team, are we able to talk freely?',
              high: 'Uninhibited — we can be completely honest (+3)', low: 'Constrained (−3)' },
            { q: 'What is the tone of our interactions when we are together as a team?',
              high: 'Good natured (+3)', low: 'Antagonistic — people make digs and get defensive (−3)' },
            { q: "How invigorating are our interactions such as 1:1's or team meetings?",
              high: 'Stimulating (+3)', low: 'Boring (−3)' }
          ]
        },
        {
          name: 'Synergy',
          questions: [
            { q: 'How much synergy is there among us? (The interaction or co-operation of team members produces a combined effort greater than the sum of the individuals)',
              high: 'Abundant (+3)', low: 'Minimal (−3)' },
            { q: 'How widespread among us is the synergy — do we inspire other teams?',
              high: 'Contagious (+3)', low: 'Confined (−3)' },
            { q: "How much of our synergy is focused on the results we need to produce (as opposed to things that aren't critical)?",
              high: 'Channeled (+3)', low: 'Misdirected (−3)' }
          ]
        },
        {
          name: 'Surpassing Results',
          questions: [
            { q: 'How good are our results?',
              high: 'Remarkable (+3)', low: 'Average (−3)' },
            { q: 'How does what we produce reflect who we are?',
              high: 'Uniquely ours (+3)', low: 'Any team could produce our work (−3)' },
            { q: 'How do the benefits we produce compare to the costs we incur?',
              high: 'High yield on investment (+3)', low: 'Achieved at excessive cost — time / money / effort (−3)' }
          ]
        }
      ]
    },
    {
      section: '7. Renewal',
      subsections: [
        {
          name: 'Recognition and Celebration',
          questions: [
            { q: 'Do we get enough recognition for what we do?',
              high: 'Satisfying (+3)', low: 'Inadequate (−3)' },
            { q: 'Is the recognition we get fair?',
              high: 'Fair (+3)', low: 'Not fair (−3)' },
            { q: 'Is the recognition we get the kind we want / need?',
              high: 'Valued by us (+3)', low: 'Unappreciated by us (−3)' }
          ]
        },
        {
          name: 'Change Mastery',
          questions: [
            { q: 'What is our basic attitude toward change?',
              high: 'Adaptive (+3)', low: 'Resistant (−3)' },
            { q: 'How active are we in shaping change in the organisation as a whole?',
              high: 'Active (+3)', low: 'Passive (−3)' },
            { q: 'Do we see change as an opportunity or a threat?',
              high: 'Opportunistic (+3)', low: 'Protective (−3)' }
          ]
        },
        {
          name: 'Staying Power',
          questions: [
            { q: 'What is our energy level like?',
              high: 'High (+3)', low: 'Low (−3)' },
            { q: 'How evenly do we sustain our energy level?',
              high: 'Constant (+3)', low: 'Sporadic — in highs and lows (−3)' },
            { q: 'How is our energy level changing?',
              high: 'Increasing (+3)', low: 'Getting lower (−3)' }
          ]
        }
      ]
    }
  ];

  // ── Create Form (anonymous) ─────────────────────────────────────────────
  var form = FormApp.create('Team Performance Survey');
  form.setCollectEmail(false);           // anonymous
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setDescription(
    'Please rate each question on the 7-point scale below.\n' +
    'The LEFT label represents the most positive view (+3) and the RIGHT label represents the most negative view (−3).\n\n' +
    'Your responses are completely anonymous — no email address is collected.'
  );
  form.setConfirmationMessage('Thank you for completing the Team Performance Survey. Your responses have been recorded.');

  // ── Add questions, tracking column positions ────────────────────────────
  // Col A in the response sheet = Timestamp (added automatically by Forms)
  // Questions start at col B (index 2)
  var colIndex = 2;
  var sectionCols = []; // [{name, startCol, endCol}]

  survey.forEach(function (sec) {
    var secStart = colIndex;

    form.addSectionHeaderItem().setTitle(sec.section);

    sec.subsections.forEach(function (sub) {
      form.addSectionHeaderItem().setTitle(sub.name);

      sub.questions.forEach(function (qData) {
        // Google Forms LinearScale supports 1–10; we use 1–7
        // 1 = left label (positive, +3)   7 = right label (negative, −3)
        // Conversion back to −3…+3:  score = 4 − response_value
        form.addScaleItem()
          .setTitle(qData.q)
          .setBounds(1, 7)
          .setLabels(qData.high, qData.low)
          .setRequired(true);
        colIndex++;
      });
    });

    sectionCols.push({ name: sec.section, startCol: secStart, endCol: colIndex - 1 });
  });

  // ── Create Spreadsheet and link Form ───────────────────────────────────
  var ss = SpreadsheetApp.create('Team Performance Survey — Results');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Give Apps Script a moment to create the Form Responses sheet
  Utilities.sleep(3000);
  ss = SpreadsheetApp.openById(ss.getId());

  var respSheetName = 'Form Responses 1';
  var respSheet = ss.getSheetByName(respSheetName);
  if (!respSheet) {
    // Fallback: use whatever sheet was created
    respSheetName = ss.getSheets()[ss.getSheets().length - 1].getName();
  }

  // ── Build Section Summary sheet ─────────────────────────────────────────
  var summary = ss.insertSheet('Section Summary', 0);

  // Header row
  summary.getRange('A1:D1').setValues([['Section', 'Score (−3 to +3)', 'Interpretation', 'Responses']]);
  summary.getRange('A1:D1').setFontWeight('bold').setBackground('#4a86e8').setFontColor('#ffffff');

  sectionCols.forEach(function (sec, i) {
    var row = i + 2;
    var startLetter = colToLetter(sec.startCol);
    var endLetter   = colToLetter(sec.endCol);

    // All question columns for this section, rows 2 onward
    var dataRange = "'" + respSheetName + "'!" + startLetter + '2:' + endLetter;
    // First-question column for counting responses
    var countRange = "'" + respSheetName + "'!" + startLetter + '2:' + startLetter;

    summary.getRange(row, 1).setValue(sec.name);

    // Score = 4 − AVERAGE(all responses in section)
    // This converts the 1–7 scale back to −3…+3
    summary.getRange(row, 2).setFormula(
      '=IFERROR(4-AVERAGE(' + dataRange + '),"—")'
    );

    // Interpretation label
    summary.getRange(row, 3).setFormula(
      '=IFERROR(' +
        'IF(NOT(ISNUMBER(B' + row + ')),"—",' +
        'IF(B' + row + '>1,"Strong ✓",' +
        'IF(B' + row + '>0,"Positive",' +
        'IF(B' + row + '=0,"Neutral",' +
        'IF(B' + row + '>=-1,"Needs work","Attention needed ⚠"' +
        '))))),"—")'
    );

    // Number of responses (non-empty cells in first question column)
    summary.getRange(row, 4).setFormula(
      '=IFERROR(COUNTA(' + countRange + '),0)'
    );
  });

  // Column widths
  summary.setColumnWidth(1, 230);
  summary.setColumnWidth(2, 160);
  summary.setColumnWidth(3, 170);
  summary.setColumnWidth(4, 110);

  // Score: 2 decimal places
  summary.getRange('B2:B8').setNumberFormat('0.00');

  // Conditional formatting on Score column
  var scoreRange = summary.getRange('B2:B8');
  summary.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(1)
      .setBackground('#c6efce').setFontColor('#276221')
      .setRanges([scoreRange]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(-1, 1)
      .setBackground('#ffeb9c').setFontColor('#9c5700')
      .setRanges([scoreRange]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(-1)
      .setBackground('#ffc7ce').setFontColor('#9c0006')
      .setRanges([scoreRange]).build()
  ]);

  // ── Log the important URLs ──────────────────────────────────────────────
  Logger.log('');
  Logger.log('=== TEAM PERFORMANCE SURVEY CREATED ===');
  Logger.log('');
  Logger.log('Share this link with your team (anonymous):');
  Logger.log(form.getPublishedUrl());
  Logger.log('');
  Logger.log('Results spreadsheet:');
  Logger.log(ss.getUrl());
  Logger.log('');
  Logger.log('Edit the form (admin only):');
  Logger.log(form.getEditUrl());
}

// Converts a 1-based column number to a spreadsheet column letter (A, B, … Z, AA, …)
function colToLetter(col) {
  var s = '';
  while (col > 0) {
    var rem = (col - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    col = Math.floor((col - rem - 1) / 26);
  }
  return s;
}
