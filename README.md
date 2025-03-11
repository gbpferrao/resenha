# Resenha

Resenha is a simple group chat web application with a modern dark theme. Users can join a single open chat room, set their display name, and exchange messages with others. Messages automatically expire after 24 hours.

## Features

- Modern dark-themed UI
- Single open group chat room
- Customizable display names
- Messages expire after 24 hours
- Responsive design (works on mobile and desktop)
- No account registration needed

## Tech Stack

- Frontend: Vanilla HTML, CSS, and JavaScript
- Backend: Node.js with Express.js
- Database: SQLite3

## Setup and Installation

### Prerequisites

- Node.js 14+ and npm installed on your system

### Local Development

1. Clone the repository:
   ```
   git clone <repository-url>
   cd resenha
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Production Deployment

#### Option 1: Deploy to a VPS or dedicated server

1. Install Node.js on your server
2. Clone the repository to your server
3. Install dependencies with `npm install`
4. Start the application with a process manager like PM2:
   ```
   npm install -g pm2
   pm2 start server/index.js --name resenha
   ```
5. Configure a reverse proxy (Nginx or Apache) to forward traffic to your Node.js application

#### Option 2: Deploy to Heroku

1. Create a Heroku account if you don't have one
2. Install the Heroku CLI
3. Login to Heroku: `heroku login`
4. Create a new Heroku app: `heroku create your-app-name`
5. Push to Heroku: `git push heroku main`

#### Option 3: Docker deployment

1. Build the Docker image:
   ```
   docker build -t resenha .
   ```

2. Run the container:
   ```
   docker run -p 3000:3000 -d resenha
   ```

## Data Persistence

The application uses SQLite as its database, which stores data in a file (`server/db/chat.db`). For production deployments, you might want to:

1. Set up database backups
2. Consider migrating to a more robust database like PostgreSQL or MySQL for higher traffic scenarios

## License

MIT

---

Feel free to contribute to this project by submitting pull requests or reporting issues! 