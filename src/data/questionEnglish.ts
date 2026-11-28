import type { QuestionOption } from '@/types/quiz'

const questions: Record<string, { prompt: string; options: string[] }> = {
  'V2035-01': { prompt: 'Which mascot represents agility and innovation at MMV?', options: ['Swallow', 'Dragon', 'Chameleon'] },
  'V2035-02': { prompt: 'Complete the message: “Be agile to innovate and …”', options: ['Outperform every competitor', 'Grow with technology', 'Persevere with joy'] },
  'V2035-03': { prompt: 'Which of the DX, FX and GX symbols represents digital transformation?', options: ['FX symbol', 'DX symbol', 'GX symbol'] },
  'V2035-04': { prompt: 'Which value does the handshake symbol represent in 3C with I?', options: ['Collaboration', 'Commitment', 'Integrity'] },
  'V2035-05': { prompt: 'Look at the two Vision images. Which one shows all four values of 3C with I?', options: ['Image A', 'Image B'] },
  'V2035-06': { prompt: 'According to Vision 2035, whom does MMV aim to become the trusted choice for?', options: ['Customers only', 'Customers, employees and society', 'Employees and partners only'] },
  'V2035-07': { prompt: 'Are high-quality products enough to become “the trusted choice for the future”?', options: ['Yes, because quality is the most important factor.', 'No. MMV also needs to create value for employees and society.', 'Yes, if customers keep placing orders.'] },
  'V2035-08': { prompt: 'What is the most important thing Agility and Gritty Joy have in common?', options: ['Always change as quickly as possible.', 'Focus only on the final result.', 'Adapt to change and persevere through difficulties with a positive attitude.'] },
  'V2035-09': { prompt: 'Which statement does NOT reflect Localization at DiVA?', options: ['Vietnamese employees think independently and make proposals.', 'Vietnamese employees must do everything themselves, without support from Japan.', 'Vietnamese employees gradually build their ability to work independently.'] },
  'V2035-10': { prompt: 'What is the role of CX in relation to BX, DX, FX and GX?', options: ['Take over the work of the other pillars.', 'Communicate results only after the other pillars finish.', 'Connect people, build trust and encourage collaboration across pillars.'] },
  'V2035-11': { prompt: 'Which statement does NOT reflect Collaboration?', options: ['Respect differences.', 'Everyone must always agree.', 'Support each other and work toward a shared goal.'] },
  'V2035-12': { prompt: 'You notice something unusual that could affect product quality. What do you do?', options: ['Wait for a defect to occur', 'Take preventive action', 'Report the issue proactively', 'Ignore it', 'Work together to find the cause', 'Keep production running', 'Stay silent'] },
  'V2035-13': { prompt: 'An issue affects several departments. Which actions show Commitment?', options: ['Pass the responsibility to someone else', 'Track progress', 'Wait for another department', 'Coordinate proactively', 'Do only your own part', 'See the issue through to resolution', 'Give up'] },
  'V2035-14': { prompt: 'Your team is struggling with an improvement and has not reached the desired result. Which actions show Gritty Joy?', options: ['Stop improving', 'Keep a positive attitude', 'Wait for management to decide', 'Find a solution together', 'Blame others', 'Persevere through setbacks', 'Get discouraged'] },
  'V2035-15': { prompt: 'Which actions help MMV become “the trusted choice for the future”?', options: ['Care only about your own department', 'Collaborate', 'Maintain quality', 'Wait for instructions', 'Make improvements', 'Compete internally', 'Build a good work environment', 'Avoid change'] },
}

export function localizeQuestion<T extends { question_code: string; prompt_text: string; options_json: QuestionOption[] }>(question: T, locale: 'vi' | 'en'): T {
  const text = locale === 'en' ? questions[question.question_code] : undefined
  if (!text) return question
  return {
    ...question,
    prompt_text: text.prompt,
    options_json: question.options_json.map((option) => {
      const ordinal = option.key.match(/-L(\d+)$/)
      const index = ordinal ? Number(ordinal[1]) - 1 : option.key.charCodeAt(0) - 65
      return { ...option, text: text.options[index] ?? option.text }
    }),
  }
}
