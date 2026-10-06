import 'package:flutter/material.dart';

import '../../shared/glass/glass_surface.dart';
import 'dashboard_models.dart';

class TodayMomentumCard extends StatelessWidget {
  const TodayMomentumCard({
    super.key,
    required this.notes,
    required this.todayFocusSeconds,
    required this.dailyGoalHours,
  });

  final List<DashboardNote> notes;
  final int todayFocusSeconds;
  final double dailyGoalHours;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final startOfToday = DateTime(now.year, now.month, now.day);
    final todayNotes = notes.where((note) => !note.updatedAt.isBefore(startOfToday)).length;
    final focusMinutes = todayFocusSeconds ~/ 60;
    final goalMinutes = (dailyGoalHours * 60).round().clamp(1, 1440).toInt();
    final progress = goalMinutes == 0 ? 0 : ((focusMinutes / goalMinutes) * 100).round().clamp(0, 100).toInt();

    final String message;
    if (progress >= 100) {
      message = 'Daily focus goal reached. Protect the momentum and finish strong.';
    } else if (focusMinutes > 0 && todayNotes > 0) {
      message = 'You logged ' + focusMinutes.toString() + 'm of focus and updated ' + todayNotes.toString() + ' ' + (todayNotes == 1 ? 'note' : 'notes') + ' today.';
    } else if (focusMinutes > 0) {
      message = 'You already have ' + focusMinutes.toString() + 'm in the bank. One more focused block keeps the streak moving.';
    } else if (todayNotes > 0) {
      message = 'Your library is active: ' + todayNotes.toString() + ' ' + (todayNotes == 1 ? 'note was' : 'notes were') + ' updated today.';
    } else {
      message = 'Your next focused block is the easiest way to create momentum today.';
    }

    final label = progress >= 100
        ? 'Goal complete'
        : progress >= 60
            ? 'Strong momentum'
            : progress > 0
                ? 'Building momentum'
                : 'Ready to begin';

    return GlassSurface(
      borderRadius: 26,
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: const Color(0x1A66E6B8),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x4066E6B8)),
                ),
                child: const Icon(Icons.trending_up_rounded, size: 18, color: Color(0xFF8BECCB)),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Today’s Momentum',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1.8, color: Colors.white),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0x1A66E6B8),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0x3366E6B8)),
                ),
                child: Text(
                  progress.toString() + '%',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFFD3FFE9)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: const EdgeInsets.only(left: 46),
              child: Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF8993A8))),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: focusMinutes.toString(),
                            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, height: 1, color: Colors.white),
                          ),
                          const TextSpan(
                            text: ' focus min',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF8A94A8)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      message,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, height: 1.45, color: Color(0xFF8993A8)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0x09FFFFFF),
                  border: Border.all(color: const Color(0x14FFFFFF)),
                ),
                child: Center(
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0x0D6BE8FF),
                      border: Border.all(color: const Color(0x336BE8FF)),
                    ),
                    child: Icon(
                      progress >= 100 ? Icons.check_circle_outline_rounded : Icons.auto_awesome_rounded,
                      size: 20,
                      color: progress >= 100 ? const Color(0xFF8BECCB) : const Color(0xFF8AE9FF),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: SizedBox(
              height: 8,
              child: Stack(
                children: [
                  const Positioned.fill(child: ColoredBox(color: Color(0x0FFFFFFF))),
                  FractionallySizedBox(
                    widthFactor: progress / 100,
                    child: const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [Color(0xFF8BECCB), Color(0xFF62E0C8), Color(0xFF8AE9FF)]),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('TODAY', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: Color(0xFF667084))),
              Text(focusMinutes.toString() + ' / ' + goalMinutes.toString() + ' min', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 0.7, color: Color(0xFF667084))),
            ],
          ),
        ],
      ),
    );
  }
}
