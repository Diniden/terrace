#!/usr/bin/env bash

# Docker database management script for Terrace project

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

command="${1:-help}"

case "$command" in
  start)
    echo "Starting PostgreSQL container..."
    docker-compose up -d postgres
    echo "Waiting for PostgreSQL to be ready..."
    sleep 3
    docker-compose exec -T postgres pg_isready -U terrace || echo "Database is starting up..."
    echo "PostgreSQL is ready!"
    ;;

  stop)
    echo "Stopping PostgreSQL container..."
    docker-compose stop postgres
    echo "PostgreSQL stopped."
    ;;

  restart)
    echo "Restarting PostgreSQL container..."
    docker-compose restart postgres
    echo "PostgreSQL restarted."
    ;;

  down)
    echo "Stopping and removing PostgreSQL container..."
    docker-compose down
    echo "PostgreSQL container removed."
    ;;

  logs)
    echo "Showing PostgreSQL logs (Ctrl+C to exit)..."
    docker-compose logs -f postgres
    ;;

  psql)
    echo "Connecting to PostgreSQL..."
    docker-compose exec postgres psql -U terrace -d terrace
    ;;

  reset)
    echo "Resetting PostgreSQL database..."
    read -p "This will delete all data. Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose down -v
      docker-compose up -d postgres
      echo "Database reset complete!"
    else
      echo "Reset cancelled."
    fi
    ;;

  status)
    echo "PostgreSQL container status:"
    docker-compose ps postgres
    ;;

  help|*)
    echo "Docker Database Management for Terrace"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start    - Start PostgreSQL container"
    echo "  stop     - Stop PostgreSQL container"
    echo "  restart  - Restart PostgreSQL container"
    echo "  down     - Stop and remove PostgreSQL container"
    echo "  logs     - Show PostgreSQL logs"
    echo "  psql     - Connect to PostgreSQL CLI"
    echo "  reset    - Reset database (removes all data)"
    echo "  status   - Show container status"
    echo "  help     - Show this help message"
    ;;
esac
