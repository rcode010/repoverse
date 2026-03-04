const token = import.meta.env.VITE_GITHUB_TOKEN

export async function fetchRepos(username) {
  const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  })

  const repos = await response.json()

  // if username doesn't exist the API returns a message not an array
  if (!Array.isArray(repos)) {
    throw new Error('User not found')
  }

  return repos.map((repo, index) => {
    const columns = 5
    const spacing = 30
    const col = index % columns
    const row = Math.floor(index / columns)
    const x = col * spacing - (columns * spacing) / 2 + Math.random() * 8 - 4
    const z = row * spacing - 50 + Math.random() * 8 - 4

    const height = Math.min(80, Math.max(10, repo.size * 0.3))
    const width = 10
    const depth = 10

    const now = Date.now()
    const pushedAt = new Date(repo.pushed_at).getTime()
    const daysSince = (now - pushedAt) / (1000 * 60 * 60 * 24)

    let color
    if (daysSince < 7)        color = 0x00ff88
    else if (daysSince < 30)  color = 0x4488ff
    else if (daysSince < 180) color = 0xffaa00
    else                      color = 0x555555

    return {
      name: repo.name,
      pushedAt: repo.pushed_at,
      size: repo.size,
      issues: repo.open_issues_count,
      language: repo.language,
      isPrivate: repo.private,
      url: repo.html_url,
      x, z, width, height, depth, color
    }
  })
}