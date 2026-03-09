export const pushTemplates = {
    // 1. Churn Prevention (At-Risk Users)
    churn_prevention: {
        title: "Streak Saver 🚨",
        description: "Motivate users who haven't worked out in a while to save their streak.",
        templates: [
            "Hey {name}, your streak is at risk! You have {hours_left}h left to save it! ⚠️",
            "{name}, don't let your {streak}-day streak die! The gym is calling. 💪",
            "We haven't seen you in a while, {name}! Come in today and keep your momentum going."
        ]
    },

    // 2. Motivation (Active Users)
    motivation: {
        title: "Daily Motivation 🔥",
        description: "Quick hits to get people off the couch and into the gym.",
        templates: [
            "The iron is waiting, {name}. Are you crushing a workout today? 🏋️",
            "No excuses today, {name}! Let's get that {streak}-day streak bumped up.",
            "Rise and grind! Time to crush those goals, {name}. 🚀"
        ]
    },

    // 3. Event Announcements (All Users)
    events: {
        title: "Gym Events & News 📅",
        description: "Broadcast upcoming events or important gym-wide news.",
        templates: [
            "Don't forget: {event_name} is happening! Secure your spot now.",
            "New equipment alert! We just leveled up the gym. Come check it out.",
            "Holiday hours change: We are closing early tomorrow at 8 PM."
        ]
    },

    // 4. Milestones (Variable Triggers)
    milestones: {
        title: "Milestone Celebration 🎉",
        description: "Celebrate user consistency.",
        templates: [
            "Incredible work, {name}! You just hit a {streak}-day streak! Keep it up! 🏆",
            "You are on fire, {name}! Let's make it {next_streak} days."
        ]
    }
};

/**
 * Replaces template variables (e.g., {name}) with actual user data.
 * @param {string} template - The template string with variables.
 * @param {object} userData - An object containing user data (e.g., { name: 'Jan', streak: 12, hours_left: 48 }).
 * @returns {string} The finalized message.
 */
export function injectTemplateVariables(template, userData) {
    if (!template || !userData) return template || "";

    let message = template;

    // Replace standard variables if they exist in userData
    const variables = ['name', 'streak', 'hours_left', 'event_name', 'next_streak', 'gym_name', 'days_away', 'yearly_goal'];

    variables.forEach(v => {
        // Use a regex to dynamically replace all instances of {variable}
        const regex = new RegExp(`\\{${v}\\}`, 'g');
        if (userData[v] !== undefined && userData[v] !== null) {
            message = message.replace(regex, userData[v]);
        } else {
            // If the template requires a variable but we don't have data, just remove the placeholder
            // This is a safety fallback, ideally the UI shouldn't allow sending a template with missing data
            message = message.replace(regex, '');
        }
    });

    // Clean up any double spaces caused by missing data
    return message.replace(/\s+/g, ' ').trim();
}
