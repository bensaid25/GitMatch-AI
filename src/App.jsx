import { useState } from 'react'
import './App.css'

function App() {
  // --- STATE MANAGEMENT ---
  const [role, setRole] = useState(null); // Tracks user persona: 'visitor' or 'recruiter'
  const [username, setUsername] = useState(""); // Input for GitHub handle
  const [userData, setUserData] = useState(null); // Storage for main user profile
  const [repos, setRepos] = useState([]); // Storage for the most recent 12 repos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jobDesc, setJobDesc] = useState(""); // Input for HR matching
  const [matchResult, setMatchResult] = useState(null); // Results from the matching engine

  // --- UI: LANDING PAGE ---
  if (!role) {
    return (
      <div className="container role-screen">
        <div className="hero-section">
          <h1 className="sparkle-text">GitHub Analyzer PRO</h1>
          <p className="subtitle">Precision analytics for the modern developer</p>
        </div>
        <div className="role-selection">
          <div className="role-card" onClick={() => setRole('visitor')}>
            <div className="role-icon">🔍</div>
            <h3>Visitor</h3>
            <p>Explore technical profiles & repo stats</p>
            <button className="select-btn">Get Started</button>
          </div>
          <div className="role-card hr-theme" onClick={() => setRole('recruiter')}>
            <div className="role-icon">💼</div>
            <h3>Recruiter</h3>
            <p>Match candidates to internship roles</p>
            <button className="select-btn">Enter Workspace</button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * FETCH PROFILE DATA
   * Queries the GitHub REST API for user details and their most recently updated repos.
   */
  const fetchProfile = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    setUserData(null);
    try {
      // Fetch user profile info
      const userRes = await fetch(`https://api.github.com/users/${username}`);
      if (!userRes.ok) throw new Error("User not found!");
      const userJson = await userRes.json();

      // Fetch the last 12 updated repositories
      const repoRes = await fetch(`${userJson.repos_url}?sort=updated&per_page=12`);
      const repoJson = await repoRes.json();

      setUserData(userJson);
      setRepos(repoJson);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * DATA ANALYSIS ENGINE
   * Calculates a proprietary "Dev Score" and identifies top programming languages.
   */
  const getAnalysis = () => {
    if (!userData) return null;
    
    // Calculate experience years
    const years = new Date().getFullYear() - new Date(userData.created_at).getFullYear() || 1;
    
    // Developer Score Logic: weighted based on activity and social proof
    const score = Math.min((userData.public_repos * 2) + (userData.followers * 1) + (years * 5), 100);

    // Language Distribution Logic
    const langMap = {};
    repos.forEach(repo => { 
      if (repo.language) langMap[repo.language] = (langMap[repo.language] || 0) + 1; 
    });
    const topLangs = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { score, years, topLangs };
  };

  /**
   * HR MATCHING ENGINE
   * Performs a keyword extraction match between a job description and repo metadata.
   */
  const runHRAnalysis = () => {
    // 1. Clean and tokenize the job description keywords
    const keywords = jobDesc.toLowerCase().split(/[ ,.]+/).filter(w => w.length > 3);
    const foundSkills = new Set();

    // 2. Scan every repository's name, description, and language for keyword matches
    repos.forEach(repo => {
      const fullText = `${repo.name} ${repo.description} ${repo.language}`.toLowerCase();
      keywords.forEach(word => { 
        if (fullText.includes(word)) foundSkills.add(word); 
      });
    });

    // 3. Update result state with a normalized score
    setMatchResult({ 
      score: Math.min((foundSkills.size / 4) * 100, 100), 
      skills: Array.from(foundSkills) 
    });
  };

  const analysis = getAnalysis();

  return (
    <div className="container main-layout">
      {/* --- PERSISTENT NAVIGATION --- */}
      <header className="navbar no-print">
        <button className="nav-back" onClick={() => setRole(null)}>← Switch Role</button>
        <div className="nav-logo">GA <span className="badge">PRO</span></div>
      </header>
      
      {/* --- SEARCH INTERFACE --- */}
      <div className="search-container no-print">
        <div className="search-glass">
          <input 
            type="text" 
            placeholder="Search GitHub Username..." 
            onChange={(e) => setUsername(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && fetchProfile()} 
          />
          <button onClick={fetchProfile} className="analyze-btn">
            {loading ? "..." : "Analyze"}
          </button>
        </div>
      </div>

      {error && <div className="error-toast">⚠️ {error}</div>}

      {/* --- ANALYTICS DASHBOARD --- */}
      {userData && (
        <div className="dashboard printable-area">
          <div className="profile-hero">
            <img src={userData.avatar_url} alt="Avatar" className="user-avatar" />
            <div className="user-meta">
              <h2>{userData.name || userData.login}</h2>
              <p>@{userData.login} • Joined {new Date(userData.created_at).getFullYear()}</p>
              <button className="no-print export-btn" onClick={() => window.print()}>Generate PDF</button>
            </div>
          </div>

          <div className="data-grid">
            {/* Score Visualization using SVG Progress Circle */}
            <div className="glass-card score-panel">
              <h4>Dev Score</h4>
              <div className="score-ring">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${analysis.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.35" className="percentage">{analysis.score}</text>
                </svg>
              </div>
            </div>

            {/* Language Distribution Radar */}
            <div className="glass-card skills-panel">
              <h4>Skill Radar</h4>
              {analysis.topLangs.map(([lang, count]) => (
                <div key={lang} className="skill-bar-wrap">
                  <div className="skill-info"><span>{lang}</span><span>{Math.round((count/repos.length)*100)}%</span></div>
                  <div className="bar-bg"><div className="bar-fill" style={{ width: `${(count/repos.length)*100}%` }}></div></div>
                </div>
              ))}
            </div>
          </div>

          {/* --- RECRUITER EXCLUSIVE WORKSPACE --- */}
          {role === 'recruiter' && (
            <div className="hr-workspace no-print">
              <h3>Internship Matching Engine</h3>
              <textarea placeholder="Paste requirements here..." value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} />
              <button onClick={runHRAnalysis} className="hr-btn">Match Profile</button>
              {matchResult && (
                <div className="match-badge">
                  <strong>Compatibility: {matchResult.score.toFixed(0)}%</strong>
                  <small>Matched: {matchResult.skills.join(', ') || "No overlap found"}</small>
                </div>
              )}
            </div>
          )}

          {/* --- REPOSITORY FEED --- */}
          <div className="repo-section">
            <h3>Recent Projects</h3>
            <div className="repo-grid">
              {repos.slice(0, 4).map(repo => (
                <div key={repo.id} className="repo-item">
                  <div className="repo-head">
                    <strong>{repo.name}</strong>
                    <span className="lang-tag">{repo.language}</span>
                  </div>
                  <p>{repo.description || "Consistent repository development."}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;