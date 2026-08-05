import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INSTALL_SCRIPT = ROOT / "install.sh"
ENV_EXAMPLE = ROOT / "agent.env.example"


class AgentInstallManifestTest(unittest.TestCase):

    def test_install_script_ships_command_polling_and_stream_forward_executor(self):
        source = INSTALL_SCRIPT.read_text(encoding="utf-8")

        self.assertIn("agent_commands.py", source)
        self.assertIn("stream_forward_executor.py", source)
        self.assertIn("run_agent.py", source)
        self.assertIn("agent.env.example", source)

    def test_agent_env_template_exposes_webrtc_nat_deploy_knobs(self):
        source = ENV_EXAMPLE.read_text(encoding="utf-8")

        self.assertIn("WEBRTC_PUBLIC_IP", source)
        self.assertIn("WEBRTC_STUN_URLS", source)
        self.assertIn("WEBRTC_TURN_URLS", source)
        self.assertIn("ZLM_RTC_EXTERN_IP", source)

    def test_install_script_validates_agent_env_before_starting_service(self):
        source = INSTALL_SCRIPT.read_text(encoding="utf-8")

        self.assertIn("validate_agent_env()", source)
        self.assertIn("your-agent-token-here", source)
        self.assertIn('validate_agent_env "$resolved_install_dir/agent.env"', source)
        self.assertLess(source.index('validate_agent_env "$resolved_install_dir/agent.env"'), source.index("cat <<UNIT"))


if __name__ == "__main__":
    unittest.main()
