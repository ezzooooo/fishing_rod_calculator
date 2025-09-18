# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Flutter desktop application for Windows called "낚시대 계산기" (Fishing Rod Calculator). It's designed to help calculate pricing for fishing rods with features including brand management, fishing rod management, and a calculator interface.

## Development Commands

### Core Commands
- `flutter run -d windows` - Run the application on Windows desktop
- `flutter build windows` - Build the Windows desktop application
- `flutter test` - Run all tests
- `flutter analyze` - Run static analysis
- `flutter pub get` - Install dependencies
- `flutter pub upgrade` - Upgrade dependencies

### Code Generation
- `flutter packages pub run build_runner build` - Generate Freezed/JSON serialization code
- `flutter packages pub run build_runner build --delete-conflicting-outputs` - Regenerate all generated files
- `flutter packages pub run build_runner watch` - Watch for changes and regenerate automatically

### Testing
- `flutter test test/models/` - Run model tests only
- `flutter test test/providers/` - Run provider tests only
- `flutter test test/screens/` - Run screen tests only
- `flutter test test/integration/` - Run integration tests

## Architecture

### State Management
- **Riverpod**: Primary state management solution using `flutter_riverpod`
- Providers are located in `lib/providers/` directory
- Main providers: `brand_provider.dart`, `fishing_rod_provider.dart`, `calculation_provider.dart`

### Navigation
- **Go Router**: Declarative routing using `go_router` package
- Router configuration: `lib/routes/app_router.dart`
- Routes: `/` (home), `/brands`, `/fishing-rods`, `/system-settings`

### Data Models
- **Freezed**: Immutable data classes with code generation
- **JSON Serialization**: Automatic JSON serialization using `json_annotation`
- Models location: `lib/models/`
- Core models: `Brand`, `FishingRod`, `CalculationItem`

### Data Storage
- **SharedPreferences**: Local data persistence
- **JSON Assets**: Pre-loaded data from `assets/brands.json` and `assets/fishing_rods.json`

## Project Structure

```
lib/
├── main.dart                 # App entry point with theme configuration
├── models/                   # Data models (Freezed + JSON serializable)
├── providers/                # Riverpod providers for state management
├── routes/                   # Go Router configuration
├── screens/                  # UI screens
├── widgets/                  # Reusable widgets
└── utils/                    # Utility functions

assets/
├── brands.json               # Pre-loaded brand data
└── fishing_rods.json         # Pre-loaded fishing rod data

test/
├── models/                   # Model unit tests
├── providers/                # Provider unit tests
├── screens/                  # Screen widget tests
└── integration/              # Integration tests
```

## Key Features

### Brand Management
- CRUD operations for fishing rod brands
- Brand selection for fishing rods

### Fishing Rod Management
- CRUD operations for fishing rods
- Length specification (min/max values, even/odd configuration)
- Price configuration per length
- Brand association

### Calculator Interface
- Fishing rod selection and search
- Quantity input per rod length
- Discount rate calculation (40%-70% in 5% increments)
- Total price calculation
- Print functionality using `printing` package

## Code Generation Requirements

This project uses Freezed for data classes and JSON serialization. After modifying any model files, run:
```
flutter packages pub run build_runner build --delete-conflicting-outputs
```

## Dependencies of Note

- `flutter_riverpod`: State management
- `go_router`: Navigation and routing
- `freezed`: Immutable data classes
- `json_annotation`/`json_serializable`: JSON serialization
- `shared_preferences`: Local storage
- `printing`: PDF generation and printing
- `file_picker`: File selection
- `intl`: Internationalization
- `uuid`: Unique ID generation

## Development Notes

- The app uses Korean language interface
- Designed specifically for Windows desktop
- Custom theme with increased font sizes for desktop use
- Comprehensive test coverage across models, providers, and screens
- Uses Material Design 3 (`useMaterial3: true`)