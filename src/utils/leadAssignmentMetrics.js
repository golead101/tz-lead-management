const DEMO_STAGES = ['Demo Scheduled', 'Demo Attended', 'Free Class'];
const STAGE_CHANGE_TITLES = ['Stage Shifted', 'STAGE Modified'];

// Reconstructs a lead's ordered {counselor, date} assignment events from createdDate
// plus every 'COUNSELOR Modified' audit entry updateLead() writes on reassignment.
function getAssignmentEvents(lead) {
  const timeline = Array.isArray(lead.timeline) ? lead.timeline : [];
  const counselorMods = timeline
    .filter(t => t && t.title === 'COUNSELOR Modified' && t.content)
    .map(t => {
      const m = t.content.match(/Changed from "([^"]*)" to "([^"]*)"/i);
      return m ? { from: m[1], to: m[2], date: t.timestamp } : null;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const events = [];
  const initialCounselor = counselorMods.length > 0 ? counselorMods[0].from : lead.counselor;
  events.push({ counselor: initialCounselor || 'Unassigned', date: lead.createdDate });
  counselorMods.forEach(m => events.push({ counselor: m.to || 'Unassigned', date: m.date }));
  return events;
}

function stageTransitions(lead) {
  const timeline = Array.isArray(lead.timeline) ? lead.timeline : [];
  return timeline
    .filter(t => t && STAGE_CHANGE_TITLES.includes(t.title) && t.content)
    .map(t => {
      const m = t.content.match(/to "([^"]+)"/i);
      return m ? { stage: m[1], date: t.timestamp } : null;
    })
    .filter(Boolean);
}

function isContacted(lead) {
  const timeline = Array.isArray(lead.timeline) ? lead.timeline : [];
  const hasCallEvent = timeline.some(t => t && t.type === 'call');
  return hasCallEvent || lead.stage !== 'New Lead';
}

function isInterestedReached(lead) {
  if (lead.stage === 'Interested') return true;
  return stageTransitions(lead).some(t => t.stage === 'Interested');
}

function isDemoReached(lead) {
  const timeline = Array.isArray(lead.timeline) ? lead.timeline : [];
  if (timeline.some(t => t && t.type === 'demo')) return true;
  if (DEMO_STAGES.includes(lead.stage)) return true;
  return stageTransitions(lead).some(t => DEMO_STAGES.includes(t.stage));
}

function isConverted(lead) {
  return !!lead.convertedAt || lead.stage === 'Converted';
}

export function getPeriodBounds(dateFilter, customStart, customEnd) {
  const now = new Date();
  let start, end;
  if (dateFilter === 'Today') {
    start = new Date(now); start.setHours(0, 0, 0, 0);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  } else if (dateFilter === 'This Week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start = new Date(now); start.setDate(now.getDate() + diffToMonday); start.setHours(0, 0, 0, 0);
    end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
  } else if (dateFilter === 'This Month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    start = customStart ? new Date(customStart) : new Date(now);
    start.setHours(0, 0, 0, 0);
    end = customEnd ? new Date(customEnd) : new Date(now);
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

// Per-counselor Assigned/Contacted/Interested/Demo/Converted, computed from real
// assignment + timeline events for the given period (no schema/Firestore changes).
export function computeCounselorMetrics(leads, counselorNames, periodStart, periodEnd) {
  const inPeriod = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d >= periodStart && d <= periodEnd;
  };

  const perCounselor = {};
  counselorNames.forEach(name => {
    perCounselor[name] = { name, assignedLeads: [], contactedLeads: [], interestedLeads: [], demoLeads: [], convertedLeads: [], stageCounts: {} };
  });

  leads.forEach(lead => {
    const events = getAssignmentEvents(lead);
    const matchingEvents = events.filter(e => inPeriod(e.date) && perCounselor[e.counselor]);
    if (matchingEvents.length === 0) return;

    const countedCounselors = new Set();
    matchingEvents.forEach(evt => {
      if (countedCounselors.has(evt.counselor)) return;
      countedCounselors.add(evt.counselor);
      const bucket = perCounselor[evt.counselor];
      bucket.assignedLeads.push(lead);
      // Tally by the lead's actual current stage (the literal call outcome/pipeline
      // stage set by logCall()/the Kanban board), so admins can see where contacted
      // leads really landed instead of just a flat "Contacted" total.
      const stageName = lead.stage || 'New Lead';
      bucket.stageCounts[stageName] = (bucket.stageCounts[stageName] || 0) + 1;
      if (isContacted(lead)) {
        bucket.contactedLeads.push(lead);
        if (isInterestedReached(lead)) {
          bucket.interestedLeads.push(lead);
          if (isDemoReached(lead)) bucket.demoLeads.push(lead);
        }
      }
      if (isConverted(lead)) bucket.convertedLeads.push(lead);
    });
  });

  return Object.values(perCounselor).map(c => ({
    name: c.name,
    assigned: c.assignedLeads.length,
    contacted: c.contactedLeads.length,
    interested: c.interestedLeads.length,
    demo: c.demoLeads.length,
    converted: c.convertedLeads.length,
    pending: c.assignedLeads.length - c.contactedLeads.length,
    stageBreakdown: Object.entries(c.stageCounts)
      .filter(([stage]) => stage !== 'New Lead')
      .map(([stage, count]) => ({ stage, count }))
      .sort((a, b) => b.count - a.count)
  }));
}
