import 'package:flutter/material.dart';

import 'router.dart';
import 'theme.dart';

class NewLuminoApp extends StatelessWidget {
  const NewLuminoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NewLumino',
      debugShowCheckedModeBanner: false,
      theme: NewLuminoTheme.dark(),
      initialRoute: NewLuminoRouter.home,
      onGenerateRoute: NewLuminoRouter.onGenerateRoute,
    );
  }
}