import 'package:flutter/material.dart';

import '../features/dashboard/dashboard_page.dart';

class NewLuminoRouter {
  static const home = '/';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    return MaterialPageRoute(
      settings: settings,
      builder: (_) => const DashboardPage(),
    );
  }
}
