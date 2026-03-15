# Personliness Questionnaire v2

62 questions mapping to core and Heinlein traits.
Multiplier: 1.0 = full weight, 0.5 = half weight. Reversed questions score inverted.

`fixtures/questions.json` is the machine-readable artifact used by Django (`loaddata`). This file is the human-readable source of truth for review and editing. After editing here, update the fixture to match.

---

## Questions

| # | Text | Reversed | Mapped Traits |
|---|------|----------|---------------|
| 1 | When facing a big decision, how often do you think through multiple possible outcomes before acting? | No | Strategic Intelligence ×1.0, Numerical & Analytical Reasoning ×0.6, Strategic Planning & Command ×0.4 |
| 2 | How often have you been able to persuade a group to follow a plan you proposed? | No | Leadership / Influence ×1.0, Leadership & Followership ×0.6, Strategic Intelligence ×0.4 |
| 3 | How often do you act on impulse without considering long-term effects? | Yes | Strategic Intelligence ×1.0, Moral Fallibility & Growth ×0.5, Justice Orientation ×0.4 |
| 4 | When people around you are struggling, how often do you step in to help them emotionally or physically? | No | Compassion / Empathy ×1.0, Caregiving & Nurture ×0.6, Relatability / Cultural Embeddedness ×0.4 |
| 5 | How often do you adapt to sudden changes in plans without becoming frustrated? | No | Courage / Resilience ×1.0, Hardship Tolerance ×0.6 |
| 6 | How often do you come up with ideas that others consider new or unusual? | No | Creative / Innovative Thinking ×1.0, Artistic & Cultural Expression ×0.5 |
| 7 | How often do you organize people or resources to achieve a shared goal? | No | Administrative / Legislative Skill ×1.0, Institution-Building ×0.6, Impact Legacy ×0.5 |
| 8 | How often do you stand up to unfair treatment of others, even at personal cost? | No | Justice Orientation ×1.0, Courage / Resilience ×0.6, Ethical / Philosophical Insight ×0.5 |
| 9 | How often do you refuse to admit mistakes, even when evidence is clear? | Yes | Moral Fallibility & Growth ×1.0, Justice Orientation ×0.4 |
| 10 | How often do people see you as inspiring or motivating them? | No | Leadership / Influence ×1.0, Archetype Resonance ×0.6, Impact Legacy ×0.5 |
| 11 | How often have you created something that lasted or kept functioning for years? | No | Institution-Building ×1.0, Impact Legacy ×0.8, Construction & Fabrication ×0.5 |
| 12 | How often do you take part in activities that bring joy, humor, or beauty into your life? | No | Joy / Play / Aesthetic Appreciation ×1.0, Artistic & Cultural Expression ×0.5 |
| 13 | How often do you keep calm and act deliberately when facing danger or a crisis? | No | Existential Composure ×1.0, Mortality Acceptance ×0.5, Medical Aid & Emergency Response ×0.4 |
| 14 | How often do you reconcile seemingly opposite ideas or roles in your life? | No | Paradox Integration ×1.0, Ethical / Philosophical Insight ×0.6 |
| 15 | How often do you avoid physical activity or let your fitness decline? | Yes | Physical Endurance / Skill ×1.0, Hardship Tolerance ×0.5 |
| 16 | How often do you care for children, elderly, or those who need special help? | No | Caregiving & Nurture ×1.0, Compassion / Empathy ×0.7, Parental / Mentoring Quality ×0.5 |
| 17 | How often do you plan complex projects with multiple steps or teams? | No | Strategic Planning & Command ×1.0, Administrative / Legislative Skill ×0.7, Leadership / Influence ×0.4 |
| 18 | How often do you handle raw food (cleaning, cutting, preparing meat or vegetables)? | No | Animal & Food Processing ×1.0, Culinary Skill ×0.6 |
| 19 | How often do you navigate or find your way in unfamiliar places? | No | Navigation & Wayfinding ×1.0, Strategic Intelligence ×0.4 |
| 20 | How often do you waste resources or fail to plan for future needs? | Yes | Strategic Planning & Command ×0.9, Agricultural & Resource Management ×0.7 |
| 21 | How often do you repair tools, appliances, or machines yourself? | No | Manual Craft & Repair ×1.0, Technical & Systemic Problem-Solving ×0.7 |
| 22 | How often do you treat or assist with injuries or health emergencies? | No | Medical Aid & Emergency Response ×1.0, Courage / Resilience ×0.6, Caregiving & Nurture ×0.4 |
| 23 | How often do you insist on being in charge when someone else is better suited? | Yes | Leadership & Followership ×1.0, Moral Fallibility & Growth ×0.5 |
| 24 | How often do you grow plants or manage land for food or other resources? | No | Agricultural & Resource Management ×1.0, Hardship Tolerance ×0.5 |
| 25 | How often do you prepare meals from scratch? | No | Culinary Skill ×1.0, Animal & Food Processing ×0.6, Joy / Play / Aesthetic Appreciation ×0.4 |
| 26 | How often do you train or practice for self-defense or protecting others? | No | Combat & Defense ×1.0, Courage / Resilience ×0.6 |
| 27 | How often do you solve technical or mechanical problems effectively? | No | Technical & Systemic Problem-Solving ×1.0, Manual Craft & Repair ×0.7, Numerical & Analytical Reasoning ×0.5 |
| 28 | How often do you use numbers or data to make better decisions? | No | Numerical & Analytical Reasoning ×1.0, Strategic Intelligence ×0.6 |
| 29 | How often do you create or perform art, music, or writing? | No | Artistic & Cultural Expression ×1.0, Creative / Innovative Thinking ×0.7, Archetype Resonance ×0.4 |
| 30 | How often do you keep your commitments to others even when it is inconvenient? | No | Justice Orientation ×1.0, Ethical / Philosophical Insight ×0.6, Leadership & Followership ×0.5, Spousal / Partner Quality ×0.4 |
| 31 | How often do you act mainly for personal gain at the expense of others? | Yes | Compassion / Empathy ×1.0, Justice Orientation ×0.7 |
| 32 | How often do you remain emotionally steady during serious illness or injury? | No | Existential Composure ×1.0, Mortality Acceptance ×0.6 |
| 33 | How often do you maintain a connection with everyday people regardless of status? | No | Relatability / Cultural Embeddedness ×1.0, Compassion / Empathy ×0.6 |
| 34 | How often do you avoid opportunities to experience beauty, humor, or play? | Yes | Joy / Play / Aesthetic Appreciation ×1.0, Artistic & Cultural Expression ×0.5 |
| 35 | How often do you serve as a symbol or role model for others? | No | Archetype Resonance ×1.0, Leadership / Influence ×0.6, Impact Legacy ×0.5 |
| 36 | How often do you endure long periods of discomfort or difficulty without giving up? | No | Hardship Tolerance ×1.0, Courage / Resilience ×0.6 |
| 37 | How often do you blend different sides of your personality or beliefs into harmony? | No | Paradox Integration ×1.0, Ethical / Philosophical Insight ×0.6, Moral Fallibility & Growth ×0.5 |
| 38 | How often do you organize or change rules to improve fairness? | No | Administrative / Legislative Skill ×0.9, Justice Orientation ×0.8, Impact Legacy ×0.6 |
| 39 | How often do you neglect physical skills that could keep you capable and independent? | Yes | Physical Endurance / Skill ×1.0, Combat & Defense ×0.5 |
| 40 | How often do you make meals that others find both tasty and nourishing? | No | Culinary Skill ×1.0, Animal & Food Processing ×0.5, Caregiving & Nurture ×0.5 |
| 41 | How often do you adapt tools or materials to serve new purposes? | No | Manual Craft & Repair ×0.9, Creative / Innovative Thinking ×0.8, Construction & Fabrication ×0.6 |
| 42 | How often do you prepare for and act quickly in emergencies? | No | Medical Aid & Emergency Response ×0.9, Strategic Planning & Command ×0.7, Technical & Systemic Problem-Solving ×0.6 |
| 43 | How often do you explore new places purely out of curiosity? | No | Navigation & Wayfinding ×0.9, Joy / Play / Aesthetic Appreciation ×0.5 |
| 44 | How often do you let fear stop you from defending yourself or others? | Yes | Courage / Resilience ×1.0, Combat & Defense ×0.6 |
| 45 | How often do you take part in activities that keep your body strong and skilled? | No | Physical Endurance / Skill ×1.0, Hardship Tolerance ×0.6 |
| 46 | How often do you take part in cultural traditions or events? | No | Relatability / Cultural Embeddedness ×0.8, Artistic & Cultural Expression ×0.7 |
| 47 | How often do you contribute to building something that benefits your community? | No | Institution-Building ×1.0, Impact Legacy ×0.8, Construction & Fabrication ×0.7, Agricultural & Resource Management ×0.5 |
| 48 | How often do you face thoughts of mortality without panic or denial? | No | Mortality Acceptance ×1.0, Existential Composure ×0.7 |
| 49 | How often do you balance multiple demands without neglecting key responsibilities? | No | Paradox Integration ×1.0, Strategic Intelligence ×0.7 |
| 50 | How often do you ignore the needs of people who depend on you? | Yes | Compassion / Empathy ×1.0, Caregiving & Nurture ×0.7 |
| 51 | In your closest relationship or partnership, how often do you provide genuine emotional support during difficult times? | No | Spousal / Partner Quality ×1.0, Compassion / Empathy ×0.5, Caregiving & Nurture ×0.4 |
| 52 | How often do you prioritize your partner's or closest person's growth and wellbeing alongside your own? | No | Spousal / Partner Quality ×1.0, Justice Orientation ×0.4 |
| 53 | How often do you neglect the emotional needs of your partner or closest person? | Yes | Spousal / Partner Quality ×1.0, Compassion / Empathy ×0.5 |
| 54 | How often do you actively help someone you mentor, teach, or parent develop their own independent abilities? | No | Parental / Mentoring Quality ×1.0, Caregiving & Nurture ×0.6, Leadership / Influence ×0.4 |
| 55 | When guiding someone younger or less experienced, how often do you encourage them to think for themselves rather than just follow you? | No | Parental / Mentoring Quality ×1.0, Leadership & Followership ×0.5, Ethical / Philosophical Insight ×0.4 |
| 56 | How often do you behave very differently depending on whether you are with a close friend, a child, an authority figure, or a stranger — adapting naturally to each? | No | Relational Range ×1.0, Paradox Integration ×0.5, Relatability / Cultural Embeddedness ×0.4 |
| 57 | How often do you maintain meaningful relationships across very different types of people (e.g., family, colleagues, neighbors, people of different ages or backgrounds)? | No | Relational Range ×1.0, Compassion / Empathy ×0.5, Leadership / Influence ×0.3 |
| 58 | How often do you use the same approach with everyone regardless of who they are or what they need? | Yes | Relational Range ×1.0, Parental / Mentoring Quality ×0.5 |
| 59 | How often do you think carefully about questions of right and wrong, or about what makes a good life? | No | Ethical / Philosophical Insight ×1.0, Mortality Acceptance ×0.5, Paradox Integration ×0.4 |
| 60 | When you have done something that changed how others live or work, how long has that effect lasted? | No | Impact Legacy ×1.0, Institution-Building ×0.6, Administrative / Legislative Skill ×0.4 |
| 61 | How often do you build or construct physical things with your own hands? | No | Construction & Fabrication ×1.0, Manual Craft & Repair ×0.6 |
| 62 | After making a significant mistake, how often have you genuinely changed your behavior as a result? | No | Moral Fallibility & Growth ×1.0, Ethical / Philosophical Insight ×0.5, Courage / Resilience ×0.4 |
