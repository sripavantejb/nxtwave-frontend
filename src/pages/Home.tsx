import { Link } from 'react-router-dom'
import { FaChartBar, FaArrowRight } from 'react-icons/fa'
import { BsCurrencyDollar } from 'react-icons/bs'

export default function Home() {
  const topics = [
    {
      id: 'profit-loss',
      name: 'Profit and Loss',
      description: 'Master the fundamentals of profit, loss, cost price, selling price, and percentage calculations.',
      icon: FaChartBar
    },
    {
      id: 'si-ci',
      name: 'Simple Interest & Compound Interest',
      description: 'Master Simple Interest and Compound Interest calculations. Learn formulas, solve real-world problems, and understand the key differences.',
      icon: BsCurrencyDollar
    }
  ]

  return (
    <div style={{ paddingBottom: 16 }}>
      <div className="hero">
        <h1>Choose a Concept to Begin</h1>
        <p>Rate yourself and take a 6-question adaptive quiz.</p>
      </div>
      
      <div className="grid" style={{ marginTop: 24 }}>
        {topics.map((topic) => {
          const IconComponent = topic.icon
          return (
            <div key={topic.id} className="col-6">
              <Link to={`/rate/${topic.id}`} style={{ textDecoration: 'none', width: '100%', display: 'flex' }}>
                <div className="card card-accent">
                  <div className="topic-icon">
                    <IconComponent />
                  </div>
                  <h2 className="card-title">{topic.name}</h2>
                  <p className="muted" style={{ marginBottom: 18, lineHeight: 1.6, flexGrow: 1 }}>
                    {topic.description}
                  </p>
                  <div className="btn" style={{ alignSelf: 'flex-start' }}>
                    Start Quiz <FaArrowRight style={{ marginLeft: 6, fontSize: '14px' }} />
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}


