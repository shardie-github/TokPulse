# Contributing to TokPulse

Thank you for your interest in contributing to TokPulse! This document provides guidelines and information for contributors.

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 20 or higher
- pnpm 8 or higher
- Git
- A code editor (VS Code recommended)

### Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/tokpulse.git
   cd tokpulse
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**

   ```bash
   pnpm db:push
   pnpm db:seed
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

Examples:

- `feature/user-authentication`
- `fix/payment-processing-bug`
- `docs/api-documentation`

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(auth): add OAuth2 authentication flow
fix(api): resolve webhook processing timeout
docs(readme): update installation instructions
```

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following our coding standards
3. **Add tests** for new functionality
4. **Run quality checks**:
   ```bash
   pnpm quality:check
   ```
5. **Update documentation** if needed
6. **Submit a pull request** with a clear description

### Pull Request Template

When creating a PR, please include:

- **Description**: What changes were made and why
- **Type**: Feature, bug fix, documentation, etc.
- **Testing**: How the changes were tested
- **Breaking Changes**: Any breaking changes (if applicable)
- **Screenshots**: For UI changes
- **Checklist**: Confirm all requirements are met

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer type annotations over `any`
- Use interfaces for object shapes
- Follow naming conventions (camelCase for variables, PascalCase for types)

### React Components

- Use functional components with hooks
- Prefer composition over inheritance
- Use TypeScript for props and state
- Follow the component structure in existing code

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable and function names
- Write self-documenting code
- Add comments for complex logic

### File Organization

- Group related functionality together
- Use barrel exports (`index.ts`) for packages
- Keep files focused and single-purpose
- Follow the existing directory structure

## Testing

### Unit Tests

- Write tests for all new functionality
- Use Vitest for unit testing
- Aim for high test coverage
- Test edge cases and error conditions

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test --coverage
```

### E2E Tests

- Add E2E tests for critical user flows
- Use Playwright for E2E testing
- Test both happy path and error scenarios

```bash
# Install Playwright browsers
pnpm e2e:install

# Run E2E tests
pnpm e2e

# Run E2E tests with UI
pnpm e2e:ui
```

### Testing Guidelines

- Write tests before or alongside code (TDD/BDD)
- Use descriptive test names
- Test behavior, not implementation
- Mock external dependencies
- Keep tests independent and isolated

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms and business logic
- Keep README files up to date
- Update API documentation for changes

### README Files

Each package should have a README.md with:

- Purpose and description
- Installation instructions
- Usage examples
- API reference (if applicable)
- Contributing guidelines

## Review Process

### For Contributors

1. **Self-review** your code before submitting
2. **Test thoroughly** on your local machine
3. **Address feedback** promptly and professionally
4. **Keep PRs focused** and reasonably sized
5. **Respond to reviews** constructively

### For Reviewers

1. **Review promptly** (within 48 hours when possible)
2. **Be constructive** and specific in feedback
3. **Test the changes** locally if needed
4. **Approve when ready** or request changes
5. **Provide guidance** for improvements

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

- **Description**: Clear description of the issue
- **Steps to reproduce**: Detailed steps to reproduce
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node.js version, browser, etc.
- **Screenshots**: If applicable
- **Logs**: Relevant error messages or logs

### Feature Requests

When requesting features, please include:

- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives**: Other solutions considered
- **Additional context**: Any other relevant information

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped appropriately
- [ ] Release notes prepared

## Getting Help

- 📧 Email: hardoniastore@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/tokpulse/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-org/tokpulse/discussions)
- 📖 Documentation: [docs/](docs/)

## Recognition

Contributors will be recognized in:

- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to TokPulse! 🚀
